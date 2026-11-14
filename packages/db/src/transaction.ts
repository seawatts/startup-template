import { sql } from 'drizzle-orm';
import { db, requestStatementLimit } from './client';

export type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type Options = {
  /** Transaction-local settings, such as the tenant id row-level security reads. */
  settings?: Record<string, string>;
  statementLimit?: string;
  isolationLevel?: 'repeatable read' | 'serializable';
};

/**
 * One transaction with a statement limit and optional transaction-local
 * settings. Independent reads inside it run together: issue them with
 * `Promise.all` and the driver pipelines them on the transaction's
 * connection, so three reads cost about one round trip, not three.
 *
 * The settings go out as the transaction's first statement and the
 * callback's first reads are sent right behind it instead of waiting a round
 * trip for its answer. One connection runs them in order, so nothing reads
 * before the settings apply, and a failed setting aborts the transaction
 * under every read queued after it.
 */
export function inTransaction<T>(
  fn: (tx: Transaction) => Promise<T>,
  {
    settings = {},
    statementLimit = requestStatementLimit,
    isolationLevel,
  }: Options = {},
): Promise<T> {
  const configs = Object.entries({
    ...settings,
    statement_timeout: statementLimit,
  }).map(([name, value]) => sql`set_config(${name}, ${value}, true)`);
  return db.transaction(
    async (tx) => {
      const configured = tx
        .execute(sql`select ${sql.join(configs, sql`, `)}`)
        .then(() => undefined);
      try {
        const result = await fn(tx);
        await configured;
        return result;
      } catch (error) {
        // The setting's own error wins over the reads it aborted.
        await configured;
        throw error;
      }
    },
    // Read committed is PostgreSQL's default, so it needs no SET
    // TRANSACTION: one less round trip before the first read.
    isolationLevel ? { isolationLevel } : undefined,
  );
}
