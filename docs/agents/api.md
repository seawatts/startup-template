# API

oRPC in `packages/api`, served by the web app at `/api/rpc`. One set of procedures, typed end to end, is the only way data is read or written. The same procedures feed the app (client components with React Query), the public REST API and its OpenAPI document, the SDK, the CLI and the MCP server ([interfaces.md](interfaces.md)), the mobile app and the editor extension (`createClient`).

## The standard

- Every read and every write is a procedure. No server actions (`'use server'`): a server action is a second, private API that the REST API, the SDK, the CLI and MCP cannot call, with its own auth and error handling.
- Pages read on the client. A page, layout or template is a static frame (heading, tabs, copy); each part that needs data is a client component that calls `useQuery(api.<area>.<name>.queryOptions())` and shows its own skeleton while it waits ([ui.md](ui.md)). A server file may read the session with `readSession` to redirect or answer 404, and nothing else. Server prefetch with a hydration boundary was measured no faster than a static frame plus client reads, and it makes the page a dynamic function with cold starts ([speed.md](speed.md)).
- Saves are `useMutation(api.<area>.<name>.mutationOptions())`, then invalidate only the queries the save changed. A save that opens another site (Stripe Checkout) returns the address and the browser goes there.
- `scripts/test/data-through-api.test.ts` (in the pre-push hook) fails on a `'use server'` file and on a server page, layout or template that imports the database, a router, the full auth instance or Stripe, or prefetches.

## Procedures

- An area is one file in `packages/api/src/router/`, exporting a plain object of procedures built from `publicProcedure` or `protectedProcedure` (`packages/api/src/orpc.ts`). `protectedProcedure` refuses a signed-out caller and makes `context.auth.userId` a string.
- A read is marked `.route({ method: 'GET' })`. A write has no marker and is always a POST. The route refuses a GET for an unmarked procedure, so a link, an image tag or a prefetch can never trigger a write, and reads can be batched and told apart from writes by method.
- A read never writes, and the database client enforces it: a GET procedure runs inside `readingOnly` and a writing statement is refused. Work a change causes is published as an event by the save ([events.md](events.md)); a record of the request itself (last used) runs after the response inside `notReading`.
- Fail with `new ORPCError('NOT_FOUND', { message })` (or `BAD_REQUEST`, `FORBIDDEN`, `UNAUTHORIZED`) when the caller can act on the reason. Anything else thrown is logged in full on the server and answered as a plain 500, so no stack or SQL reaches the browser.
- Validate input with zod (`.input(z.object({ … }))`). The first three problems are returned as the message.

## Adding an area

1. Write `packages/api/src/router/<area>.ts`.
2. Add it to `appRouter` in `root.ts` (types, the in-process caller) and to `rpcRouter` in `rpc-router.ts` (what `/api/rpc` serves). `packages/api/tests/rpc-router.test.ts` fails when the two differ.

`rpcRouter` loads an area's code the first time one of its procedures is called. A cold server answers its first read after evaluating one area, not the whole API; this matters more with every area added. Keep heavy imports (SDKs, PDF or AI libraries) inside the handler that needs them (`await import(…)`), not at the top of a router file every call loads.

## Calling it

- Client component: `const api = useORPC()` from `@seawatts/api/react/react`, then `useQuery(api.org.current.queryOptions())`, `useQuery(api.billing.getInvoices.queryOptions({ input: { limit: 20 }, enabled }))`, `useMutation(api.apiKeys.create.mutationOptions({ onSuccess }))`.
- After a save, invalidate only what it changed: `queryClient.invalidateQueries({ queryKey: api.apiKeys.allWithLastUsage.key() })`. `api.key()` invalidates everything and is for sign-out and switching organization.
- Job, workflow step or test: `createCaller(context)` from `@seawatts/api/caller` calls procedures in process with the same checks. Pages never use it.
- Outside React: `createClient({ baseUrl })` from `@seawatts/api/client`, then `await client.org.current()`. React Native uses `createNativeClient` (`@seawatts/api/native`), which imports only types from the router.

## Adding a feature, end to end

The Links area is the worked example; copy its files and rename. Each step has a check that fails until it is done.

1. Table: a schema file in `packages/db/src/schema/`, then `bun db:gen-migration`. A tenant table needs its grants and policy in the same migration ([database-roles.md](database-roles.md)); `shortUrls` got them in `0002_database_roles.sql`, and `0003_links.sql` adds its unique code and list index.
2. Procedures: `packages/api/src/router/links.ts`. Reads are `.route({ method: 'GET' })`; tenant rows are read and written inside `inTenant(organizationId, …)` and every query also filters by the organization; refusals are `ORPCError` with a message a person can act on. Add the area to `root.ts` and `rpc-router.ts` (`tests/rpc-router.test.ts`).
3. Catalog: each procedure in `operations.ts` with a title and a one-or-two sentence description, or in `sessionOnly` with the reason (`tests/operations.test.ts`). That one entry is the REST endpoint, the OpenAPI operation, the SDK method, the CLI command, the MCP tool and the docs reference row.
4. Product events: each save in `product-events.ts`, its event named in `packages/analytics/src/product-events.ts` (`tests/product-events.test.ts`).
5. Page: `apps/web-app/src/app/(app)/app/links/` — a server `page.tsx` with the static frame, client components for the list (`useQuery`, skeleton, empty and error states) and the form (`useMutation`, invalidate `api.links.list.key()`), a one-click switch updated optimistically. A nav entry in the sidebar.
6. Tests: the procedures against a real database in `packages/api/tests/links.test.ts` (including that another organization cannot see or change a link); the screen at desktop and 390px in `apps/web-app/e2e`.
7. Call it for real once through the API: `curl -H "Authorization: Bearer $KEY" localhost:3000/api/v1/links.list`, or `<cli> api links.create --redirectUrl https://example.com` ([interfaces.md](interfaces.md)).

## The route

`apps/web-app/src/app/api/rpc/[[...rest]]/route.ts`:

- The browser sends the reads a screen makes at once as one request (`BatchLinkPlugin` in `react/config.ts`, `BatchHandlerPlugin` on the route, 20 at most). One request starts one server function and checks the session once; answers still stream back as each read finishes. An automated browser (`navigator.webdriver`) keeps one request per procedure so tests can hold, fail or watch a single one by its address.
- A batch of reads shares its "who is asking" lookups through `requestRead` (`database.md`). Writes share nothing.
- A write whose `Origin` is another site is refused with 403. Every answer is `Cache-Control: no-store`.

## The session reader

`createORPCContext` and the route proxy read the session with `readSession` (`packages/auth/src/session-reader.ts`), not the full Better Auth instance. The full instance (`server.ts`) carries every way to sign in and is only needed by `/api/auth/*` and by code that changes accounts. The reader shares `session-options.ts` (secret, cookie, database, session settings) and only the plugins that add session or user fields.

- A setting that changes the cookie, the session row or a session/user field goes in `session-options.ts`. A plugin that adds such a field is added to both instances; a plugin that only adds sign-in routes goes in `server.ts` alone.
- `packages/auth/tests/session-reader.test.ts` (needs `TEST_POSTGRES_URL`) fails when the two return different sessions for the same cookie. Run it after any auth change.

## Warm-up ping

`GET /api/rpc/__warm` with `Authorization: Bearer $CRON_SECRET` loads every area and runs a pool's worth of `select 1` per role, so the instance that answers next has its code loaded and its database connections open. A hosted server opens the same connections when it starts ([speed.md](speed.md#connections-at-startup)). `/api/cron/warm` sends that ping; it is a separate route because the ping has to reach the function serving `/api/rpc`. To turn it on, set `CRON_SECRET` in Infisical and add the cron to `apps/web-app/vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/warm", "schedule": "* * * * *" }] }
```

Every-minute schedules need a paid Vercel plan, so the template ships without the cron entry. Measure a cold first read before and after turning it on (`speed.md`).
