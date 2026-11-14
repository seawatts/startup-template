# Speed

What made a real app built on this template fast, in the order to apply it. Measure first, change one thing, measure again, and put both numbers in the pull request.

## Measure

- Time to content for the screen, with `SPEED=enabled bun test:e2e speed` ([tests.md](tests.md#the-speed-measurement)), as a median over several loads with network latency and CPU throttling for a phone.
- Database round trips with a delay in front of the local database, and query count per load from the statement log ([database.md](database.md#measuring)).
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
- Gate follow-up reads on data the shell already has, not on a third round trip.

## Fewer queries per request

- Share "who is asking" across a request's reads (`requestRead`).
- No N+1: one query for a list's related rows (lookups by id array, grouped queries, a recursive CTE instead of a query per level).
- Read only what the view needs. A card that shows a photo and a name reads those two columns.
- For slow SQL fix the plan: look for a correlated `EXISTS` over a materialized CTE or a lookup by a column no index leads with.

## Fewer round trips per query

- Reads that belong together run with `Promise.all` inside one transaction, where they pipeline.
- Send a transaction's settings with its first reads (`inTransaction` does).
- Keep connections warm between requests (the client's idle timeout).

## No contention on reads

- A read never writes. "Last seen" touches and similar side effects move to writes or to after the response.
- A read that must lock a row takes `FOR SHARE`, not `FOR UPDATE`: it still excludes writers, and readers stop excluding each other.

## Saves answer at commit

- Third-party calls run after the response.
- The screen refreshes in place by invalidating only the queries the save changed ([ui.md](ui.md#saves)).

## The screen draws at once

- Skeletons at the lowest component that waits on data, each with its section's real shape so nothing shifts ([ui.md](ui.md#loading)).
