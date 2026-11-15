# Bun everywhere it applies

Bun is the runtime in development, tests, scripts and production, and code uses a Bun primitive where Bun has one.

This is a consistency choice, not a speed one: one runtime, one test runner and one set of primitives everywhere. With a pooler's round trip in front of the database, Node and Bun measured within 3 to 4% of each other on server time, so don't expect or promise a faster page from the runtime.

## Runtime

- The web app runs on Bun: `apps/web-app/vercel.json` sets `bunVersion`, and its `dev`, `build` and `start` scripts run Next.js with `bun --bun`, so local runs match production. Without `--bun`, `next` starts under Node whatever launched it.
- No `engines.node` in a `package.json` the host reads: it can take precedence over `bunVersion` and put the functions back on Node.
- Scripts run with `bun path/to/script.ts`. No `tsx`, `ts-node` or `node` in a script line.
- Tests are `bun test`. Browser tests stay on Playwright ([tests.md](tests.md)).

## One version

`packageManager` in the root `package.json` pins the one Bun version. `scripts/test/bun-version.test.ts` fails when a workflow, script or doc names another (`bun-version:`, `bun@…`, `BUN_VERSION`, an `oven/bun` image tag), and the pre-push hook runs it. A `setup-bun` step with no `bun-version` reads `packageManager`, so leave it out or write the pinned value. To upgrade, change `packageManager` and every place the test then names, in one commit. Vercel takes only a major range (`bunVersion: "1.x"`), so production runs the latest release of that major; the test checks the major agrees.

## Primitives

Reach for these before a Node module or an npm package:

| Need | Use |
| --- | --- |
| Read or write a file | `Bun.file`, `Bun.write` |
| Run a command | `Bun.spawn`, `Bun.$` |
| Hash a password | `Bun.password` |
| Hash anything else | `Bun.hash`, `Bun.CryptoHasher` |
| A standalone server | `Bun.serve` |
| SQLite | `bun:sqlite` |
| Postgres | `Bun.sql` (see below) |

These are for scripts, tests, tools and standalone servers. Code that runs inside a deployed function (`apps/web-app/src` and the packages it imports) stays free of `Bun.*` and `bun:*`, so the one-step rollback to Node below keeps working; today none of it uses them.

Use a `node:*` module or a Node-only package only where Bun has no equivalent or a framework requires it, and say why in a comment next to the import. `AsyncLocalStorage` from `node:async_hooks` is one of those: Bun has no primitive of its own for it.

Move one area at a time and measure before and after. One benchmark pass is not evidence: run it twice and compare the runs with each other before comparing before with after. Cloud sessions export `BUN_OPTIONS=--smol`, which trades speed for memory, so unset it for a server you are timing (`env -u BUN_OPTIONS bun --bun next start`).

## Postgres

The database client is postgres.js with the patch in `patches/` ([database.md](database.md#the-driver-patch)), and behind Supavisor (Supabase's pooler) it stays that way. `Bun.sql` was measured on a real app:

| Connection | `Bun.sql` | Use |
| --- | --- | --- |
| Supavisor, defaults (named statements) | wrong rows and hangs | never |
| Supavisor, `prepare: false` | correct, but never pipelines, even in a transaction: one page's first batch went from 270 ms to 558 ms with the pooler 5 ms away | patched postgres.js |
| Direct connection | fine with its defaults | `Bun.sql` |
| PgBouncer 1.21 or later, transaction mode, `max_prepared_statements` set | fine with its defaults, and the fastest measured | `Bun.sql` |

- `Bun.sql` errors carry the SQLSTATE in `errno`, not `code`.
- A move to `Bun.sql` wraps `unsafe`, `begin` and `savepoint` for the read guard and the statement counter as the postgres.js client does, and reruns `packages/db/tests/unit/transaction.test.ts` and the round-trip measurement against the real pooler.

## Changing the hosted runtime

Local suites cannot prove a runtime switch on the host. `next start` and the tests see all of `node_modules`; a deployed function has only its traced files, and the trace follows Node's module resolution. A package can load everywhere locally, in a local `vercel build` too, and be missing in production on another runtime while the health route stays green.

- `bun run check:trace` (in `apps/web-app`, after a build) links each function's traced files (routes, pages, the proxy and instrumentation) into an empty folder, starts the runtime there and loads the function's external packages and its entry file. It runs at the end of every build, so a function that cannot load fails the deployment before it goes live. `TRACE_RUNTIME=node` runs the same check on Node. Each external package is loaded the way its chunk asks for it (`import()` or `require()`).
- A package with a `bun` export condition (Stripe has one) has a separate build for Bun, and the trace, which resolves as Node does, leaves that build out. The template bundles Stripe and jose, so nothing is missing today. If you mark such a package external (`serverExternalPackages`), `check:trace` fails on Bun and passes on Node; name the files of the Bun build in `outputFileTracingIncludes`, for Stripe `'/**': ['../../node_modules/stripe/{esm,cjs}/**/*.{js,json}']`. Both halves were run on a real build.
- `bun check:deploy <url>` after a deploy sends one request to every kind of function: plain route, auth, Stripe webhook, cron, oRPC, REST, MCP, a database read, static and rendered pages, the proxy redirect, and a page that loads an external package. Each expects the answer a caller with no credentials gets, so it signs in to nothing and writes nothing. Add a probe when you add a kind of function. The workflow routes take only signed queue calls and have no probe; `check:trace` loads them.
- The host's runtime logs show no lines at all for a function on the Bun runtime (seen on a production app running there). Verify a release from the app's own telemetry: `bun check:deploy`, server events, the dependency heartbeat and reported exceptions ([observability.md](observability.md)). An empty log is not a clean release.
- Expect a cold first request of 3 to 6 s and warm ones of 0.1 to 0.4 s on the Bun runtime; that was measured on another production app, not on this template.
- Roll back in one step: delete `bunVersion` from `apps/web-app/vercel.json` and merge, which puts the functions back on Node and leaves Bun as package manager, test runner and script runner. Revert main at once and do not rely on the host's rollback alone: a rolled-back build may skip crons while the schema is ahead.

Promotion gates, rollback and dependency bumps are in [releases.md](releases.md).

## Runtime gotchas

- Stripe's sync `webhooks.constructEvent` throws on Bun (it has only the async Web Crypto there). Use `constructEventAsync`; `constructWebhookEvent` in `packages/stripe` does, and `packages/stripe/tests/webhook.test.ts` checks it.
- A Node preload (`NODE_OPTIONS=--import ./x`) is `--preload ./x` on Bun, or `preload` in `bunfig.toml`. Bun ignores `--preload` when it is given a package bin name, so pass the file path: `bun --bun --preload ./x.ts node_modules/next/dist/bin/next start`, not `… next start`. The template's scripts preload nothing today.
- Build and start Next.js with `bun --bun`, or it runs under Node.
- The CLI (`apps/cli`) is published for people's own Node, so its `node` shebang stays.

## Not moved yet

- `apps/chrome-extension` still uses vitest; it is not built or typechecked.
- Existing scripts and packages still import `node:fs`, `node:path` and `node:child_process`; move them when you touch them.
