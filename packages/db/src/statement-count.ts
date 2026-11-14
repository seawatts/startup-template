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
// Development only: on in dev and tests, off in a production build unless
// STATEMENT_COUNTS=enabled (for measuring a built app locally).

export type StatementCounts = {
  /** Queries the code wrote. */
  content: number;
  /** begin, commit, rollback, savepoints and settings. */
  wrapper: number;
  transactions: number;
};

const counting = new AsyncLocalStorage<StatementCounts>();

export const countsStatements = () =>
  process.env.NODE_ENV !== 'production' ||
  process.env.STATEMENT_COUNTS === 'enabled';

/** Runs `fn` and says how many statements and transactions it sent. */
export async function countingStatements<T>(fn: () => Promise<T>) {
  const counts: StatementCounts = { content: 0, transactions: 0, wrapper: 0 };
  // Awaited inside the scope: a lazy query starts when it is awaited.
  const result = await counting.run(counts, async () => await fn());
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

// drizzle sends every statement through `unsafe`, and so does the driver's
// own `begin`. The driver sends the commit (and a savepoint and its release)
// another way, so those are counted when the transaction or savepoint opens.
export function countStatements<T>(sql: T): T {
  const client = sql as unknown as Client;
  const unsafe = client.unsafe.bind(client);
  client.unsafe = (...args: unknown[]) => {
    const counts = counting.getStore();
    if (counts && typeof args[0] === 'string') {
      if (isWrapperStatement(args[0])) counts.wrapper++;
      else counts.content++;
    }
    return unsafe(...args);
  };
  for (const key of ['begin', 'savepoint'] as const) {
    const open = client[key]?.bind(client);
    if (!open) continue;
    client[key] = (...args: unknown[]) => {
      const counts = counting.getStore();
      if (counts) {
        counts.wrapper += key === 'begin' ? 1 : 2;
        if (key === 'begin') counts.transactions++;
      }
      return open(
        ...args.map((arg) =>
          typeof arg === 'function'
            ? (inner: unknown) => (arg as Callable)(countStatements(inner))
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
