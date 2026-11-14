# Bun everywhere it applies

Bun is the runtime in development, tests, scripts and production, and code uses a Bun primitive where Bun has one.

## Runtime

- The web app runs on Bun: `apps/web-app/vercel.json` sets `bunVersion`, and its `dev`, `build` and `start` scripts run Next.js with `bun --bun`, so local runs match production. Without `--bun`, `next` starts under Node whatever launched it.
- No `engines.node` in a `package.json` the host reads: it can take precedence over `bunVersion` and put the functions back on Node.
- Scripts run with `bun path/to/script.ts`. No `tsx`, `ts-node` or `node` in a script line.
- Tests are `bun test`. Browser tests stay on Playwright ([tests.md](tests.md)).

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

Move one area at a time and measure before and after.

## Postgres

The database client is still postgres.js with the patch in `patches/` ([database.md](database.md#the-driver-patch)). Moving it to `Bun.sql` is waiting on a measured run behind a transaction pooler, because the same rules apply to any driver there: prepared statements off, and no pipelining outside a transaction. Do not swap the driver without rerunning `packages/db/tests/unit/transaction.test.ts` and the round-trip measurement against a pooler.

## Not moved yet

- `packages/integ-test` and `apps/chrome-extension` still use vitest.
- Existing scripts and packages still import `node:fs`, `node:path` and `node:child_process`; move them when you touch them.
