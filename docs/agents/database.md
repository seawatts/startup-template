# Database

Drizzle on Postgres through postgres.js, in `packages/db`. Hosted, the app connects through a transaction pooler (Supabase's port 6543).

## Schema and imports

- One file per table group under `packages/db/src/schema`; import each table from its file: `import { Users } from '@seawatts/db/schema/users'`. There is no schema barrel, so a request loads only the tables its code imports.
- Write queries with the query builder (`db.select().from(Users)…`), joining what you need in one query. Do not use `db.query.*` (relational queries): it needs a registry of every table on the client, which makes every request load every table. The client has no registry.
- Migrations in `packages/db/drizzle` are append-only. Never edit an applied one. When two branches add migrations, renumber the newer one after main's right before merging.

## Queries

- Every query filters by its tenant id explicitly (`where organizationId = …`), even where row-level security would also filter. The explicit filter is what the planner uses and what a reader can check; row-level security is the backstop for the query that forgot.
- A badge or tile that shows a number reads a `count(*)`, not the list.
- A queue of pending work (deliveries to send, jobs to retry) gets a partial index on just the pending rows: `create index … on deliveries (dueAt) where status in ('pending', 'retrying')`. The table grows with history; the index stays the size of the backlog.

## The client

`packages/db/src/client.ts` holds the one connection pool.

- `prepare: false`, because a prepared statement belongs to one server connection and a transaction pooler hands out a different one per transaction.
- `connect_timeout: 5`: fail fast instead of stacking requests behind a pooler that is out of client slots.
- Idle timeout 240 s on a serverless host (20 s elsewhere), so a quiet minute doesn't cost a TLS and password round trip on the next click.
- Pool size 10 per server; `DATABASE_POOL_MAX` overrides it. It bounds your share of the pooler's client limit.
- Put the app's functions in the database's region.

## The driver and its patch

The driver is postgres.js 4 with two settings for a transaction pooler and one patch.

- `max_pipeline: 1`. The shared pool sends one query at a time per connection. The driver's default (100) pipelines queries outside a transaction, and behind Supavisor those hang or come back with another query's rows; a plain local Postgres never shows this. A connection leased by `begin` still pipelines, which is what makes `Promise.all` inside `inTransaction` cost about one round trip.
- `prepare: false`, as above.
- `patches/postgres@4.1.1.patch` (applied by Bun's `patchedDependencies`) adds `sendsAsText`: an unprepared query whose parameters are strings, booleans, bigints or finite numbers runs in the round trip of its own Parse. Upstream waits a round trip for the parameter types first, on every query, and inside a transaction that also stops pipelining. Over a 60 ms link, ten reads in one transaction: about 1.3 s unpatched, under 0.2 s patched.

Version 4 itself fixes what the older patch carried: a connection closed mid-transaction no longer hangs the pool, and `BEGIN` keeps its connection under backpressure.

The patch names one driver version, so a bump silently drops it. Two tests fail first: `packages/db/tests/unit/driver-patch.test.ts` (the patched function is in the installed driver, and the patch names the installed version) and the slow-link test in `transaction.test.ts`. On every bump re-make the patch (`bun patch postgres`, apply the hunk, `bun patch --commit`), check upstream still needs it, remove `node_modules` and reinstall, then run `packages/db/tests/unit` against a real database ([releases.md](releases.md#dependencies)).

## No advisory locks in reads

Inside `readingOnly` the client refuses `pg_advisory_lock`, `pg_advisory_xact_lock` and their shared forms with `LockInReadError` (`LOCK_IN_READ`), the same way it refuses a write. A read cannot write, so a fence protects nothing there, and one exclusive holder queues every page load behind it.

- A fence that a save needs skips itself when `currentRead()` is set.
- Row locks (`FOR SHARE`) stay allowed, and so do the `pg_try_…` forms, which never wait.
- A sweep uses `pg_try_advisory_xact_lock` and skips what a save holds. A save locks per subject, never per tenant.

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

- Statements per request: in development every `/api/rpc` answer has a `Server-Timing` header (the browser's network panel shows it under Timing): `server` is the time the server took, `db-content` the queries the code wrote, `db-wrapper` the statements that only frame a transaction (begin, commit, settings, savepoints) and `db-transactions` the transactions. `packages/db/src/statement-count.ts` counts them where statements leave the client. A built app counts only when started with `STATEMENT_COUNTS=enabled`; production never does.
  - Many content statements for one screen: an N+1, or a list read to show a count.
  - What to cut is content statements and serial awaits (a query that waits on the previous one), not transactions. The wrapper count is there to show the split; a per-read transaction is cheap because its settings go out pipelined behind `begin`.
  - Sibling lists one screen shows together belong in one read.
  - Do not share one transaction between a request's concurrent reads to lower the transaction count: it gained no time on a real app and made the driver unstable (`CONNECTION_CLOSED`, `CONNECT_TIMEOUT`). Reads one procedure issues together still go in one `inTransaction` with `Promise.all`.
  - Count another entry point (a page that reads the database itself, a webhook) by wrapping it in `countingStatements(() => …)`.
- Round trips: `packages/db/tests/utils/delay-proxy.ts` puts a delay in front of a local database. Use 30 ms each way.
- Query count per screen: `alter system set log_statement = 'all'`, reload, run a marker `select 'start'` before the load and one after, and count the log lines between them. Reset logging afterwards.
