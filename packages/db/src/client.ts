import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { databaseTls, idleTimeout, poolMax } from './connection-config';
import { env } from './env';
import { guardWritesInReads } from './read-only';

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
    // Required behind a transaction pooler (Supabase's port 6543): a
    // prepared statement belongs to one server connection and the pooler
    // hands out a different one per transaction. The patched driver
    // (patches/postgres@3.4.9.patch) makes unprepared queries cost one round
    // trip and pipeline inside a transaction.
    prepare: false,
    ssl: databaseTls(url),
  });
}

// Every statement passes the read guard: inside `readingOnly` (a GET
// procedure, for one) a write is refused before it is sent (read-only.ts).
export const connection = guardWritesInReads(connectDatabase(env.POSTGRES_URL));

// No schema registry: nothing uses Drizzle's relational queries
// (`db.query.*`), and a registry makes every request load every table.
// Queries use the builder with tables imported from their own files.
export const db = drizzle(connection);
