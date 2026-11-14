# Database

Drizzle on Postgres through postgres.js, in `packages/db`. Hosted, the app connects through a transaction pooler (Supabase's port 6543).

## Schema and imports

- One file per table group under `packages/db/src/schema`; import each table from its file: `import { Users } from '@seawatts/db/schema/users'`. There is no schema barrel, so a request loads only the tables its code imports.
- Write queries with the query builder (`db.select().from(Users)…`), joining what you need in one query. Do not use `db.query.*` (relational queries): it needs a registry of every table on the client, which makes every request load every table. The client has no registry.
- Migrations in `packages/db/drizzle` are append-only. Never edit an applied one. When two branches add migrations, renumber the newer one after main's right before merging.

## The client

`packages/db/src/client.ts` holds the one connection pool.

- `prepare: false`, because a prepared statement belongs to one server connection and a transaction pooler hands out a different one per transaction.
- `connect_timeout: 5`: fail fast instead of stacking requests behind a pooler that is out of client slots.
- Idle timeout 240 s on a serverless host (20 s elsewhere), so a quiet minute doesn't cost a TLS and password round trip on the next click.
- Pool size 10 per server; `DATABASE_POOL_MAX` overrides it. It bounds your share of the pooler's client limit.
- Put the app's functions in the database's region.

## The driver patch

`patches/postgres@3.4.9.patch` (applied by Bun's `patchedDependencies`) changes four things in postgres.js. Keep it when upgrading the driver, port it if the file moved, and run `packages/db/tests/unit/transaction.test.ts` against a real database afterwards.

1. An unprepared query with only scalar parameters skips the Describe round trip. Upstream waited a round trip for parameter types before every query and blocked the connection meanwhile, so `Promise.all` on one transaction ran serially at two round trips per query. Measured over a 60 ms link, ten reads in one transaction: 1342 ms unpatched, 184 ms patched.
2. Queries pipeline only while the connection is inside a transaction. A transaction pooler hands the server connection back after each query outside one, and drops queries pipelined behind it or answers them with another query's rows. A plain local Postgres never shows this.
3. A `BEGIN` reserves its connection even when the socket reports backpressure. Upstream could leave a pool connection open inside a transaction nobody committed.
4. A failed type lookup on a new connection no longer raises an unhandled rejection; the query that opened the connection already carries the error.

## Transactions

- `inTransaction(fn, { settings })` from `@seawatts/db/transaction` runs one transaction with a 30 s statement limit and optional transaction-local settings (for example a tenant id that row-level security reads with `current_setting`). The settings are the first statement and the callback's first reads are sent right behind them.
- Reads that belong together run together: `await Promise.all([...])` inside `inTransaction` costs about one round trip, not one per read.
- Never fire queries together outside a transaction expecting them to overlap on one connection; they queue, one on the wire at a time.
- Give each database role its own defaults as well: `alter role … set statement_timeout = '30s'` and `set idle_in_transaction_session_timeout = '30s'` for app roles, longer for workers.

## Sharing reads within a request

`requestRead(key, load)` from `@seawatts/db/request-reads` answers a lookup from the first read that asked, inside `sharingRequestReads(new Map(), handler)`. Wrap only the API's read batches in it, and use it for "who is asking" lookups (session, membership, access) that every read of a screen repeats. Writes always read fresh, and a failed lookup isn't shared. Put the tenant in the key.

## After the response

Email, third-party calls and analytics run after the response through the platform's `after`/`waitUntil`, with failures sent to error tracking. Never `void task()`: a serverless instance freezes once it has answered, mid-transaction if that is where the task was, and leaves a connection idle in transaction until the pooler fills up. Tests that check an after-response effect wait for it to settle first.

## Measuring

- Round trips: `packages/db/tests/utils/delay-proxy.ts` puts a delay in front of a local database. Use 30 ms each way.
- Query count per screen: `alter system set log_statement = 'all'`, reload, run a marker `select 'start'` before the load and one after, and count the log lines between them. Reset logging afterwards.
