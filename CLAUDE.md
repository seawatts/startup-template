# Startup template development

A Bun + Turborepo monorepo: apps in `apps/` (`web-app` is one Next.js app with marketing at `/` and the product at `/app`; plus `expo`, `cli`, `chrome-extension`, `vscode-extension`, `ios`), shared code in `packages/`, build tooling in `tooling/`. This file is the whole rule set; `docs/agents/` holds the detail for each rule. Read a detail file only when the change touches its area.

Stack: Next.js 16 (App Router), React 19, TypeScript strict, Tailwind 4, shadcn/ui (`packages/ui`), Drizzle on Supabase Postgres (`packages/db`), Better Auth (`packages/auth`), oRPC (`packages/api`), Vercel Workflow, Stripe, PostHog (`packages/analytics`), Biome, Lefthook, Infisical.

## Commands

- `bun install`, `bun dev` (everything) or `bun dev:next` (web app only).
- `bun typecheck` (run `bun run build --filter @seawatts/stripe` once first: it generates the billing ids), `bun test`, `bun test:e2e` (browser tests against a running app), `bun format:fix` (Biome + knip).
- Database: `bun db:gen-migration`, `bun db:migrate`, `bun db:push`, `bun db:seed`, `bun db:studio`. Migrations in `packages/db/drizzle` are append-only; never edit an applied one.
- `bun ui-add` adds a shadcn component to `packages/ui`.

## Working in a thread

- Start from `origin/main`, work on a branch, commit with conventional subjects (`feat(web): …`; commitlint enforces it).
- Run only the checks the change needs while you work, and the full set once before a push (`docs/agents/checks.md`). Never push with `--no-verify`; fix the cause.
- Before pushing a visible change, run the real app and look at every changed screen at desktop and 390px width in light and dark (layout, overflow, copy, empty and error states). Capture once per screen after the fixes, not after every edit.
- Secrets live only in Infisical, never in environment variables, `.env` files committed to the repository, setup scripts, hooks or an exported shell; wrap the one command that needs them (`bun with-env`) and never print a value (`docs/agents/secrets.md`).
- Replies lead with the result; say which checks actually ran.

## Code

- No barrel files: import every binding from the file that declares it, never through an `index.ts` or other re-exporting module. Biome's `noBarrelFile`/`noReExportAll` enforce it; the barrels that predate the rule are listed in `biome.json` and that list only shrinks (`docs/agents/imports.md`).
- Bun everywhere it applies: Bun is the runtime in dev, tests, scripts and production (Vercel functions on the Bun runtime), and code uses Bun primitives where Bun has one (`bun test`, `Bun.file`/`Bun.write`, `Bun.spawn`, `Bun.password`, `Bun.hash`, `Bun.serve`, `bun:sqlite`); `node:*` or a Node-only package only where Bun has none or a framework requires it, with a comment saying why. Postgres is the exception behind Supavisor: keep patched postgres.js there (`Bun.sql` cannot pipeline with `prepare: false`); `Bun.sql` is for a direct connection or PgBouncer 1.21+ (`docs/agents/bun.md`).
- Kebab-case filenames, no `any`, Node built-ins through `node:`; Biome enforces these.
- All database access goes through `@seawatts/db`. Import each table from its own file (`@seawatts/db/schema/users`), use the query builder (never `db.query.*`; the client has no schema registry), and run reads that belong together inside `inTransaction` with `Promise.all` (`docs/agents/database.md`).
- Behind a transaction pooler the driver uses `prepare: false` and pipelines only inside a transaction; keep `patches/postgres@3.4.9.patch` when upgrading the driver, and rerun its tests (`docs/agents/database.md`).
- API procedures are oRPC in `packages/api`: mark every read `.route({ method: 'GET' })`, fail with `ORPCError` when the caller can act on the reason, and add a new area to both `root.ts` and the lazily loaded `rpc-router.ts` (`docs/agents/api.md`).
- Every interface: a new or changed procedure goes in the operation catalog (`packages/api/src/operations.ts`), which generates REST, OpenAPI, the SDK, the CLI, MCP tools and the docs reference, or in `sessionOnly` with the reason; then call it once for real (`docs/agents/interfaces.md`).
- Read the session on the request path with `readSession` (`@seawatts/auth/session-reader`), never the full auth instance; session and cookie settings live in `session-options.ts` so both agree (`docs/agents/api.md`).
- A read never writes: GET procedures run under `readingOnly` and the database client refuses their writes. A save publishes a domain event after commit (`publishEvent`); the event map routes it to idempotent Vercel Workflow steps; anything due later is a per-subject workflow that sleeps until then (a week at most, then hands over to a run on the latest release) and re-reads on waking. Crons only for truly periodic work, no logic in database triggers (`docs/agents/events.md`).
- Work after the response (email, third-party calls, analytics) goes through `after`/`waitUntil`, never a bare `void promise` (`docs/agents/database.md`).
- Tests go where the behavior lives: logic and procedures in `bun test` suites, screens in `apps/web-app/e2e` at desktop and 390px; never skip or loosen a failing test (`docs/agents/tests.md`).
- Speed: about 100 ms of server time per page; measure before and after (`SPEED=enabled bun test:e2e speed`, and the `Server-Timing` statement counts in dev), one round of requests per page, no N+1, a count for a badge and never the list, a read never writes, share "who is asking" lookups across one request's reads with `requestRead` (`docs/agents/speed.md`).
- Queries filter by tenant id explicitly, with row-level security only as a backstop; cut statements and serial awaits per page, not transactions, and never share one transaction across a request's concurrent reads; queues of pending work get a partial index on the pending rows (`docs/agents/database.md`).
- Observability: errors, events and logs carry opaque ids, enums, counts and durations, never names, emails or content; every entry point reports its errors with `service`, `area` and a short `code`; page views, saves, email sends and dependency heartbeats are events; alerts and dashboards are declared in the repo and applied by a script (`docs/agents/observability.md`).

## UI

- Every visible feature works in light and dark, at desktop and 390px, designed for the phone and not a narrowed desktop, with semantic color tokens and reduced motion; use a shadcn component before custom markup (`docs/agents/ui.md`).
- Loading states go in the lowest component that waits on data: the page frame, heading, tabs and static copy render at once, and only the part waiting on a read shows a skeleton of its own shape. Never a page-blocking loader (`docs/agents/ui.md`).
- Saves feel instant: no navigation or reload after a save, invalidate only the queries the save changed, one-click controls update optimistically (`docs/agents/ui.md`).
- Buttons for actions, links for words: one primary button per card, a secondary beside it, ghost for "View all" and row actions, quiet links for opt-outs (`docs/agents/buttons.md`).
- Concise copy: marketing tiles are a label plus about 20 words; docs paragraphs about 60 words (`docs/agents/copy.md`).
- No repository references in public copy: docs, marketing, UI strings, emails and npm READMEs never cite `#123` or a private repository URL (`docs/agents/public-references.md`).

## Every feature ships with

- Analytics: every save has a row in `packages/api/src/product-events.ts` (its PostHog event, or why it has none); events are named in the catalog with content-free properties only; UI-only moments use `captureBrowserEvent` (`docs/agents/analytics-internal.md`).
- Internal (`/app/internal`): what staff need to see about a customer goes on the organization page in the same pull request; operators are rows in the `operators` table (`bun operators add <email>`), never an environment variable; operator reads use `operatorProcedure`, put organizations first and leave our own accounts out unless Include internal is on (`docs/agents/analytics-internal.md`).

## Pull requests

- One `Closes #N` per finished issue on its own line in the PR body (`Refs #N` for work that leaves it open); say which checks ran and attach screenshots of changed screens (`docs/agents/pull-requests.md`).
