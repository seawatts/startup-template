import { AsyncLocalStorage } from 'node:async_hooks';

// How much database work one request does, counted where the statements
// leave: content statements (the queries the code wrote), wrapper statements
// (begin, commit, settings, savepoints) and transactions. A page has about
// 100 ms of server time to spend (docs/agents/speed.md), and this is the
// number that says where it went. What to cut is content statements (an N+1,
// a list read to show a count, sibling lists read one by one) and serial
// awaits, not transactions: a per-read transaction is cheap when its settings
// are pipelined behind `begin`, and the wrapper count only shows the split.
//
// Counting is always on: it is an increment per statement. Production
// records the numbers per procedure in a timing event (packages/api orpc.ts).
// The per-request `Server-Timing` header is for dev and tests only, off in a
// production build unless STATEMENT_COUNTS=enabled (for measuring a built
// app locally).

export type StatementCounts = {
  /** Queries the code wrote. */
  content: number;
  /** begin, commit, rollback, savepoints and settings. */
  wrapper: number;
  transactions: number;
  /**
   * The longest any of its transactions took to start, in milliseconds: a
   * free connection (or opening one) plus `begin`. A warm server starts one
   * in a round trip, so a large number says the read stood in line for a
   * connection, not that its queries were slow.
   */
  waited?: number;
};

// Every scope the current call is inside: a request and, within it, one
// procedure. A statement counts toward each.
const counting = new AsyncLocalStorage<StatementCounts[]>();

export const countsStatements = () =>
  process.env.NODE_ENV !== 'production' ||
  process.env.STATEMENT_COUNTS === 'enabled';

/** Runs `fn` and says how many statements and transactions it sent. */
export async function countingStatements<T>(
  fn: () => Promise<T>,
  // Pass your own to read the counts when `fn` throws.
  counts: StatementCounts = { content: 0, transactions: 0, wrapper: 0 },
) {
  // Awaited inside the scope: a lazy query starts when it is awaited.
  const scopes = [...(counting.getStore() ?? []), counts];
  const result = await counting.run(scopes, async () => await fn());
  return { counts, result };
}

const wrapperStatement =
  /^\s*(begin|start transaction|commit|rollback|savepoint|release|set\s|select\s+set_config\s*\()/i;

/** Whether a statement only frames a transaction or sets it up. */
export function isWrapperStatement(statement: string) {
  return wrapperStatement.test(statement);
}

type Callable = (...args: unknown[]) => unknown;
type Client = { unsafe: Callable; begin?: Callable; savepoint?: Callable };

// drizzle sends every statement through `unsafe`. The driver sends a
// transaction's begin and commit (and a savepoint and its release) another
// way, so those are counted when the transaction or savepoint opens.
export function countStatements<T>(sql: T): T {
  const client = sql as unknown as Client;
  const unsafe = client.unsafe.bind(client);
  client.unsafe = (...args: unknown[]) => {
    const scopes = counting.getStore();
    if (scopes && typeof args[0] === 'string') {
      const wrapper = isWrapperStatement(args[0]);
      for (const counts of scopes) {
        if (wrapper) counts.wrapper++;
        else counts.content++;
      }
    }
    return unsafe(...args);
  };
  for (const key of ['begin', 'savepoint'] as const) {
    const open = client[key]?.bind(client);
    if (!open) continue;
    client[key] = (...args: unknown[]) => {
      const scopes = counting.getStore() ?? [];
      for (const counts of scopes) {
        counts.wrapper += 2;
        if (key === 'begin') counts.transactions++;
      }
      const asked = performance.now();
      return open(
        ...args.map((arg) =>
          typeof arg === 'function'
            ? (inner: unknown) => {
                // The driver calls back once it holds a connection and
                // `begin` has answered.
                if (key === 'begin') {
                  const waited = Math.round(performance.now() - asked);
                  for (const counts of scopes)
                    counts.waited = Math.max(counts.waited ?? 0, waited);
                }
                return (arg as Callable)(countStatements(inner));
              }
            : arg,
        ),
      );
    };
  }
  return sql;
}

/** `Server-Timing` entries for a request: server time and its database work. */
export function serverTiming(milliseconds: number, counts: StatementCounts) {
  return [
    `server;dur=${milliseconds.toFixed(1)}`,
    `db-content;desc="${counts.content}"`,
    `db-wrapper;desc="${counts.wrapper}"`,
    `db-transactions;desc="${counts.transactions}"`,
  ].join(', ');
}
