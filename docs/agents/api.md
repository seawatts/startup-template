# API

oRPC in `packages/api`, served by the web app at `/api/rpc`. One set of procedures, typed end to end, called three ways: from client components (`useORPC`), from server components (`orpc`, in process) and over HTTP by the CLI, the mobile app and the editor extension (`createClient`).

## Procedures

- An area is one file in `packages/api/src/router/`, exporting a plain object of procedures built from `publicProcedure` or `protectedProcedure` (`packages/api/src/orpc.ts`). `protectedProcedure` refuses a signed-out caller and makes `context.auth.userId` a string.
- A read is marked `.route({ method: 'GET' })`. A write has no marker and is always a POST. The route refuses a GET for an unmarked procedure, so a link, an image tag or a prefetch can never trigger a write, and reads can be batched and told apart from writes by method.
- A read never writes, and the database client enforces it: a GET procedure runs inside `readingOnly` and a writing statement is refused. Work a change causes is published as an event by the save ([events.md](events.md)); a record of the request itself (last used) runs after the response inside `notReading`.
- Fail with `new ORPCError('NOT_FOUND', { message })` (or `BAD_REQUEST`, `FORBIDDEN`, `UNAUTHORIZED`) when the caller can act on the reason. Anything else thrown is logged in full on the server and answered as a plain 500, so no stack or SQL reaches the browser.
- Validate input with zod (`.input(z.object({ … }))`). The first three problems are returned as the message.

## Adding an area

1. Write `packages/api/src/router/<area>.ts`.
2. Add it to `appRouter` in `root.ts` (types, server components) and to `rpcRouter` in `rpc-router.ts` (what `/api/rpc` serves). `packages/api/tests/rpc-router.test.ts` fails when the two differ.

`rpcRouter` loads an area's code the first time one of its procedures is called. A cold server answers its first read after evaluating one area, not the whole API; this matters more with every area added. Keep heavy imports (SDKs, PDF or AI libraries) inside the handler that needs them (`await import(…)`), not at the top of a router file every call loads.

## Calling it

- Client component: `const api = useORPC()` from `@seawatts/api/react/react`, then `useQuery(api.org.current.queryOptions())`, `useQuery(api.billing.getInvoices.queryOptions({ input: { limit: 20 }, enabled }))`, `useMutation(api.apiKeys.create.mutationOptions({ onSuccess }))`.
- After a save, invalidate only what it changed: `queryClient.invalidateQueries({ queryKey: api.apiKeys.allWithLastUsage.key() })`. `api.key()` invalidates everything and is for sign-out and switching organization.
- Server component: `void getQueryClient().prefetchQuery(orpc.org.current.queryOptions())` from `@seawatts/api/react/server`, inside `<HydrationBoundary>` (`@seawatts/api/react/hydration-boundary`). The client component's `useQuery` with the same options then starts with the data. Do not await the prefetch: the page frame streams at once and the part that waits shows its own skeleton (`ui.md`).
- Server action, job or test: `createCaller(() => createORPCContext())` from `@seawatts/api/caller`.
- Outside React: `createClient({ baseUrl })` from `@seawatts/api/client`, then `await client.org.current()`. React Native uses `createNativeClient` (`@seawatts/api/native`), which imports only types from the router.

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

`GET /api/rpc/__warm` with `Authorization: Bearer $CRON_SECRET` loads every area and runs `select 1`, so the instance that answers next has its code loaded and a database connection open. `/api/cron/warm` sends that ping; it is a separate route because the ping has to reach the function serving `/api/rpc`. To turn it on, set `CRON_SECRET` in Infisical and add the cron to `apps/web-app/vercel.json`:

```json
{ "crons": [{ "path": "/api/cron/warm", "schedule": "* * * * *" }] }
```

Every-minute schedules need a paid Vercel plan, so the template ships without the cron entry. Measure a cold first read before and after turning it on (`speed.md`).
