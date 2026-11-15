# Speed

What made a real app built on this template fast, in the order to apply it. Measure first, change one thing, measure again, and put both numbers in the pull request.

## The budget

About 100 ms of server time per page, for every page and every role. An over-budget page is a bug. `SPEED=enabled bun test:e2e speed` adds up each screen's server time, statements and transactions, and `SPEED_SERVER_BUDGET=100` fails a screen over it ([tests.md](tests.md#the-speed-measurement)).

## What a read costs

A read costs about its serial round trips times the round-trip time, and a page costs about its slowest read, because one request's reads share their who-is-asking checks. Production pays a few milliseconds per database round trip (about 10 ms through a pooler in another zone), so a read with fifteen serial round trips cannot fit the budget whatever its SQL does. Under 100 ms means at most about ten serial round trips per read, admission included. Count round trips, not only queries.

## Measure

- Time to content for the screen, with `SPEED=enabled bun test:e2e speed` ([tests.md](tests.md#the-speed-measurement)), as a median over several loads with network latency and CPU throttling for a phone.
- Server time, statements and transactions per request: the `Server-Timing` header on every API answer in development ([database.md](database.md#measuring)).
- Through a delay proxy and with production's pool size: `bun db:delay 55433 5 5432` holds every chunk 5 ms each way, and the app runs with the same `POSTGRES_URL` on port 55433 and `DATABASE_POOL_MAX` set to production's. Without the delay local timings are bound by CPU and mislead; with a smaller pool than production a batch with more transactions than connections queues and overstates the page (about 60 ms on a real app).
- Every benchmark twice. One pass is not evidence ([bun.md](bun.md)).
- Production is the judge: every procedure call records one content-free `procedure_timed` event with its path, milliseconds, statements, transactions and whether it answered ([observability.md](observability.md#database)). Local milliseconds say where to look; production says whether it worked.
- Query count per load from the statement log ([database.md](database.md#measuring)).
- Server code loaded per route: after a build, read `.next/server/**/*.nft.json`.
- The host's request logs for cold starts and per-request time, a few days before and after a deploy.

## Server cold start is code size

- No barrel files ([imports.md](imports.md)).
- Load each API area lazily, so a cold server evaluates only the area the first request needs.
- Read the session on the request path with a small session-only reader; the full auth instance (SSO, passkeys, OAuth providers) stays on the auth routes.
- No schema registry on the database client; import each table from its file.
- Keep the proxy (middleware) thin: a cookie check, not a database session lookup, and skip it for prefetches.
- `instrumentation.ts` uses `await import()`, since static imports there run on every function's cold start.
- If the host scales to zero, a scheduled ping that loads every API area and runs one `select 1` keeps the next person's first screen warm. Loading every area at once also catches circular imports that lazy loading hides.

## Fewer requests, sent sooner

- Batch a screen's reads into one HTTP request. Ten parallel reads otherwise start ten cold instances.
- One round of requests per page: the shell and the page send their reads together in the first batch, never the shell first and the page after it has answered.
- Gate follow-up reads on data the shell already has, not on a third round trip.
- Remember which reads a page made (per path, ids only, in `localStorage`) and send them from the HTML on the next load, before the JavaScript has loaded; on a first visit send the shell's reads. Badge counts wait until the page has settled.
- Server-side prefetch (a server component with a hydration boundary) measured no faster than a static shell plus that boot script, and it turned the page into a dynamic function with cold starts.
- Serve dynamic app paths (`/app/<tenant>/…`) from one prerendered shell with `beforeFiles` rewrites, so they come from the CDN. After a release the cold starts are then page functions no longer.

## Fewer queries per request

- Share "who is asking" across a request's reads (`requestRead`).
- No N+1: one query for a list's related rows (lookups by id array, grouped queries, a recursive CTE instead of a query per level).
- Show a number, read a count: a badge or tile that shows "5" runs one `count(*)`, never loads the list to count it.
- Read only what the view needs. A card that shows a photo and a name reads those two columns.
- A read that gates every page stays small. Split a big overview into a shell read every page needs and per-screen reads for the screens that use the rest. On a real app one 33-statement, 52 KB overview became two reads and the pages over budget fell to 3 of 179.
- Two reads on one page that need the same answer borrow it within the request (`requestRead`) and do not compute it twice.
- Whole-tenant reads count, search and page in SQL, and pickers search on the server. Never load the whole team to show a page of it: at 50,000 people one glance read went from 31 s to 0.65 s. Test at that size, with JIT set as in production.
- For slow SQL fix the plan: look for a correlated `EXISTS` over a materialized CTE or a lookup by a column no index leads with.

## Fewer round trips per query

- Reads that belong together run with `Promise.all` inside one transaction, where they pipeline.
- Tenancy: every query filters by its tenant id explicitly, with row-level security as a backstop behind it. Keep each read's transaction cheap: `inTransaction` sends `set_config` right behind `begin` with the first query behind that, so the settings cost no round trip of their own.
- A request's cost is its statement count and its serial awaits (a query that waits on the previous one), not its transaction wrappers. Cut statements per page, and collapse sibling lists one screen shows together into one read.
- Never pool one transaction across a request's concurrent reads. It was tried on a real app: no time gained (138 ms to 151 ms on one page while transactions fell from 34 to 26) and the driver became unstable (`CONNECTION_CLOSED`, `CONNECT_TIMEOUT`).
- Send a transaction's settings with its first reads (`inTransaction` does).
- Keep connections warm between requests (the client's idle timeout), and put the app's functions in the database's region.

## Admission inside a read

Who-is-asking checks run first and cheaply: identity, then membership, access and grants together, each one statement with no lock and no transaction of its own. Inside a read a membership check can return before `COMMIT`; a save still waits for it. This took about 35 ms off every read on a real app.

## One transaction per read

A helper takes its caller's transaction (`loadThingIn(tx)`) and does not open its own; aim for reads + 1 transactions per page. Merging transactions that truly run in parallel onto one connection serializes them (a connection runs one statement at a time), so measure before merging those.

## Plans that flip with tenant count

- A join of tenant-scoped tables on globally unique ids is underestimated by about the number of tenants (the planner expects one row), so it picks nested loops over CTE scans. It gets worse as tenants are added, not as one tenant grows.
- Shapes the planner cannot get wrong: a small id set as `array(select …)` in a materialized CTE, used as `col = any((select ids from scope)::text[])`; per-person lookups as scalar arrays; per-group `array_agg` then `unnest`. Never join a CTE to a CTE.
- When even that costs 30 to 60 ms per figure, read the rows once (one `json_agg` statement) and count in application code.
- Test at 4, 40 and 400 tenants (clone a seeded one), with JIT set as in production.

## Pool and pooler

- Size the per-server pool to what the pooler allows (`DATABASE_POOL_MAX`) and do not queue in the app; the pooler queues. Keep warm connections open from the warm ping.
- Quick repeated reloads move the wait to the pooler: reads of two queries then take 300 to 500 ms. Fewer transactions per page is the fix, then pooler size.

## No contention on reads

- A read never writes. "Last seen" touches and similar side effects move to writes or to after the response.
- A read that must lock a row takes `FOR SHARE`, not `FOR UPDATE`: it still excludes writers, and readers stop excluding each other.
- A read takes no advisory lock. The read guard refuses one (`LOCK_IN_READ`, [database.md](database.md#no-advisory-locks-in-reads)).

## Gotchas

- A Drizzle query is sent when it is first awaited, not when it is built. In `Promise.all([a, tx.execute(x), helperThatAwaitsInside()])` the third can reach the connection before `x`. When order matters (a `set_config` a later read depends on), start that statement first.
- Pipelining `BEGIN` together with the first statements was tried and rejected: the pooler mishandles pipelined messages outside a transaction and it cannot be tested from a sandbox.

## Saves answer at commit

- Third-party calls run after the response.
- The screen refreshes in place by invalidating only the queries the save changed ([ui.md](ui.md#saves)).

## The screen draws at once

- Skeletons at the lowest component that waits on data, each with its section's real shape so nothing shifts ([ui.md](ui.md#loading)).
