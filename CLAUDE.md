# Startup template development

A Bun + Turborepo monorepo: apps in `apps/` (`web-app` is one Next.js app with marketing at `/` and the product at `/app`; plus `expo`, `cli`, `chrome-extension`, `vscode-extension`, `ios`), shared code in `packages/`, build tooling in `tooling/`. This file is the whole rule set; `docs/agents/` holds the detail for each rule. Read a detail file only when the change touches its area.

Stack: Next.js 16 (App Router), React 19, TypeScript strict, Tailwind 4, shadcn/ui (`packages/ui`), Drizzle on Supabase Postgres (`packages/db`), Better Auth (`packages/auth`), tRPC (`packages/api`), Stripe, PostHog (`packages/analytics`), Biome, Lefthook, Infisical.

## Commands

- `bun install`, `bun dev` (everything) or `bun dev:next` (web app only).
- `bun typecheck` (run `bun run build --filter @seawatts/stripe` once first: it generates the billing ids), `bun test`, `bun format:fix` (Biome + knip).
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
- Kebab-case filenames, no `any`, Node built-ins through `node:`; Biome enforces these.
- All database access goes through `@seawatts/db`.

## UI

- Every visible feature works in light and dark, at desktop and 390px, designed for the phone and not a narrowed desktop, with semantic color tokens and reduced motion; use a shadcn component before custom markup (`docs/agents/ui.md`).
- Loading states go in the lowest component that waits on data: the page frame, heading, tabs and static copy render at once, and only the part waiting on a read shows a skeleton of its own shape. Never a page-blocking loader (`docs/agents/ui.md`).
- Saves feel instant: no navigation or reload after a save, invalidate only the queries the save changed, one-click controls update optimistically (`docs/agents/ui.md`).
- Buttons for actions, links for words: one primary button per card, a secondary beside it, ghost for "View all" and row actions, quiet links for opt-outs (`docs/agents/buttons.md`).
- Concise copy: marketing tiles are a label plus about 20 words; docs paragraphs about 60 words (`docs/agents/copy.md`).
- No repository references in public copy: docs, marketing, UI strings, emails and npm READMEs never cite `#123` or a private repository URL (`docs/agents/public-references.md`).

## Pull requests

- One `Closes #N` per finished issue on its own line in the PR body (`Refs #N` for work that leaves it open); say which checks ran and attach screenshots of changed screens (`docs/agents/pull-requests.md`).
