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

## Runtime gotchas

- Stripe's sync `webhooks.constructEvent` throws on Bun (it has only the async Web Crypto there). Use `constructEventAsync`; `constructWebhookEvent` in `packages/stripe` does, and `packages/stripe/tests/webhook.test.ts` checks it.
- A Node preload (`NODE_OPTIONS=--import ./x`) is `--preload ./x` on Bun, or `preload` in `bunfig.toml`. Bun ignores `--preload` when it is given a package bin name, so pass the file path: `bun --bun --preload ./x.ts node_modules/next/dist/bin/next start`, not `… next start`. The template's scripts preload nothing today.
- Build and start Next.js with `bun --bun`, or it runs under Node.
- The CLI (`apps/cli`) is published for people's own Node, so its `node` shebang stays.

## Not moved yet

- `apps/chrome-extension` still uses vitest; it is not built or typechecked.
- Existing scripts and packages still import `node:fs`, `node:path` and `node:child_process`; move them when you touch them.
