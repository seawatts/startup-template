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
- A Node preload (`NODE_OPTIONS=--import ./x`) is `--preload ./x` on Bun, or `preload` in `bunfig.toml`.
- Build and start Next.js with `bun --bun`, or it runs under Node.
- The CLI (`apps/cli`) is published for people's own Node, so its `node` shebang stays.

## Not moved yet

- `apps/chrome-extension` still uses vitest; it is not built or typechecked.
- Existing scripts and packages still import `node:fs`, `node:path` and `node:child_process`; move them when you touch them.
