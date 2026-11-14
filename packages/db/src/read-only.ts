import { AsyncLocalStorage } from 'node:async_hooks';

// A read never writes. When loading a page or calling a GET procedure
// backfills rows, awards something or records a mark on the way, a page load
// takes row locks, conflicts with real saves and changes data nobody asked
// to change. That work belongs to the event that causes it: a save, a
// workflow or a webhook (docs/agents/events.md). Inside `readingOnly`, every statement this
// process sends is checked before it leaves: a write is refused (in tests and
// development) or reported (in production, so a missed one is found without
// breaking the page).
//
// Not `begin read only`: a read may take FOR SHARE row locks or advisory
// locks, and PostgreSQL refuses row locks in a read-only transaction.
const reads = new AsyncLocalStorage<string>();

/** Runs `fn` as a read named `name`: the statements it sends may not write. */
export function readingOnly<T>(name: string, fn: () => T): T {
  return reads.run(name, fn);
}

/** The read the current call stack is inside, if any. */
export function currentRead() {
  return reads.getStore();
}

/**
 * Runs `fn` outside any read. Only for a record of the request itself (API
 * usage, flag exposures, error reports), never for a change to the data.
 */
export function notReading<T>(fn: () => T): T {
  return reads.exit(fn);
}

export class WriteInReadError extends Error {
  override name = 'WriteInReadError';
  readonly code = 'WRITE_IN_READ';
  constructor(
    readonly read: string,
    readonly statement: string,
  ) {
    super(`A read wrote to the database (${read}): ${statement}`);
  }
}

const writeVerb =
  /^(insert|update|delete|merge|upsert|truncate|copy|create|alter|drop|grant|revoke|comment|reindex|vacuum|cluster|refresh)\b/i;
// A data-modifying CTE: `with x as (insert …)` or `with … ) update …`.
const cteWrite =
  /(\bas\s*(not\s+)?(materialized\s*)?\(\s*|\)\s*)(insert|update|delete|merge)\b/i;

/** Whether a statement writes: its verb, or a write inside its WITH. */
export function writesData(statement: string) {
  const text = statement
    .replace(/--[^\n]*/g, ' ')
    .replace(/\/\*[\s\S]*?\*\//g, ' ')
    .trimStart();
  if (writeVerb.test(text)) return true;
  return /^with\b/i.test(text) && cteWrite.test(text);
}

// Logged even when thrown, so a caller that swallows the error still leaves
// a line a test run can find.
let onWriteInRead: (error: WriteInReadError) => void = (error) => {
  console.error(
    JSON.stringify({
      event: 'write_in_read',
      read: error.read,
      statement: error.statement,
    }),
  );
  throw error;
};
/**
 * What a write inside a read does: throw (the default) or, in production,
 * report and carry on.
 */
export function handleWritesInReads(
  handler: (error: WriteInReadError) => void,
) {
  onWriteInRead = handler;
}

function check(statement: unknown) {
  const read = reads.getStore();
  if (!read || typeof statement !== 'string' || !writesData(statement)) return;
  onWriteInRead(
    new WriteInReadError(read, statement.replace(/\s+/g, ' ').slice(0, 120)),
  );
}

type Callable = (...args: unknown[]) => unknown;
type Client = {
  unsafe: Callable;
  begin?: Callable;
  savepoint?: Callable;
};

// drizzle sends every statement through `unsafe` on the pool, a transaction
// or a savepoint; transactions and savepoints hand their callback a new
// client, which is guarded the same way.
export function guardWritesInReads<T>(sql: T): T {
  const client = sql as unknown as Client;
  const unsafe = client.unsafe.bind(client);
  client.unsafe = (...args: unknown[]) => {
    check(args[0]);
    return unsafe(...args);
  };
  for (const key of ['begin', 'savepoint'] as const) {
    const open = client[key]?.bind(client);
    if (!open) continue;
    client[key] = (...args: unknown[]) =>
      open(
        ...args.map((arg) =>
          typeof arg === 'function'
            ? (inner: unknown) => (arg as Callable)(guardWritesInReads(inner))
            : arg,
        ),
      );
  }
  return sql;
}
