import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { databaseTls, idleTimeout, poolMax } from './connection-config';
import { env } from './env';
import { guardWritesInReads } from './read-only';
import { countStatements } from './statement-count';

// The longest one statement may run inside `inTransaction`. Without a limit
// a stuck query keeps its connection forever, and a few of them leave every
// request on that server waiting. Give each database role a default too
// (`alter role … set statement_timeout`, `idle_in_transaction_session_timeout`)
// for queries outside these transactions.
export const requestStatementLimit = '30s';

export function connectDatabase(url: string) {
  return postgres(url, {
    // A healthy pooler opens a connection in a few hundred milliseconds.
    // Waiting longer only stacks requests behind a pooler that is out of
    // client slots; fail fast and let the caller try again.
    connect_timeout: 5,
    idle_timeout: idleTimeout(),
    max: poolMax(),
    // Behind a transaction pooler (Supabase's port 6543) queries pipelined
    // outside a transaction hang or get another query's rows, so the shared
    // pool sends one at a time. A connection leased by `begin` still
    // pipelines, which is what makes `Promise.all` in a transaction fast.
    max_pipeline: 1,
    // Required behind a transaction pooler: a prepared statement belongs to
    // one server connection and the pooler hands out a different one per
    // transaction. The patched driver (patches/postgres@4.1.1.patch) makes
    // an unprepared query cost one round trip instead of two.
    prepare: false,
    ssl: databaseTls(url),
  });
}

// Every statement passes the read guard: inside `readingOnly` (a GET
// procedure, for one) a write or an advisory lock is refused before it is
// sent (read-only.ts). Statements are also counted per request and per
// procedure (statement-count.ts).
const pools = new Map<string, ReturnType<typeof connectDatabase>>();
/** One guarded pool per URL: two roles that share a URL share its pool. */
export function guardedConnection(url: string) {
  let pool = pools.get(url);
  if (!pool) {
    pool = countStatements(guardWritesInReads(connectDatabase(url)));
    pools.set(url, pool);
  }
  return pool;
}

// The web role: what a request connects as. It reaches the tenant tables
// only, and row-level security shows it one organization's rows, the one
// named by the transaction (`inTenant`, transaction.ts). People,
// organizations and sessions belong to the auth role (auth-client.ts); jobs
// use the worker role (worker-client.ts).
export const connection = guardedConnection(env.POSTGRES_URL);

// No schema registry: nothing uses Drizzle's relational queries
// (`db.query.*`), and a registry makes every request load every table.
// Queries use the builder with tables imported from their own files.
export const db = drizzle(connection);
