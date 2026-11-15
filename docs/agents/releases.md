# Releases and dependencies

How a build reaches production, how it comes back, and how dependencies change. The template deploys with the host's Git integration; a product that adds its own release workflow wires these rules into it.

## Promotion is gated on the real deployment

- Build a staged production deployment, then send one request to every kind of function before promoting it: a static page, a rendered app page, the API, a cron (expect its auth refusal), each webhook (expect its signature refusal), MCP, the auth routes, a database read, and every route that loads an external package. Any 5xx blocks promotion. `bun check:deploy <url>` is that list ([bun.md](bun.md#changing-the-hosted-runtime)); add a probe with each new kind of function.
- Local suites, `next start` and a local `vercel build` can all pass while production fails, because a hosted function has only its traced files. Two real cases: a runtime switch after which functions could not load `stripe` and `jose` from their traced files, and a root `"type": "module"` traced into the CommonJS proxy function, after which every `/app` request failed with `ERR_REQUIRE_ESM`.
- `bun run check:trace` runs at the end of every build and loads every route, page, the proxy and instrumentation from only their traced files, so that class of failure stops the deployment before it goes live.
- `"type": "module"` lives in `apps/web-app/src/package.json`, never in the app's root `package.json`, for the reason above. Config files name their format in the extension (`.ts`, `.mjs`, `.cjs`).
- Prove a new build-time check on a real production build. A preview can fail earlier (no database variables) and hide it, and the build machine differs from yours: its temp folder is another filesystem, so a hard link fails with `EXDEV` and a copy is needed.

## Rollback

- Judge a release and a rollback by the deploy probes and the app's own events and exceptions; a quiet host log only means no traffic ([bun.md](bun.md#changing-the-hosted-runtime)).

- Keep one tested command that promotes the previous deployment (the host's promote or rollback), and practise it before it is needed.
- After rolling back, revert main and release at once. The rolled-back build is older than the schema, and jobs that check the schema version skip until main catches up.

## A stalled release is loud

- When production stops updating while main's checks are green, read the release build log first.
- A release workflow keeps one issue open while it fails and closes it on the next successful promotion, so a stall is never silent.

## Build memory

- Measure the build machine (memory, swap, free disk) before tuning. Size a swap file to the free disk; one that fills the disk kills the build.
- Upload source maps to error tracking after the build has exited, then delete them. Uploading inside the bundler hook holds them while the build still holds its own memory.
- A route that traces the whole app (an image or share-card route that imports app code) bloats every function. Keep such a route's imports narrow.

## Dependencies

- Audit versions regularly. Take security fixes promptly and safe minor versions together in one pull request. Hold a minor that breaks types, with a note naming the error.
- Every patched package has a guard test that fails when the patch did not apply: look for the patched function by name (`packages/db/tests/unit/driver-patch.test.ts`). Re-make the patch on each bump and check whether upstream still needs it ([database.md](database.md#the-driver-and-its-patch)).
- After a bump, remove `node_modules` and reinstall before trusting typecheck or tests. An incremental install can leave the old version linked in a workspace, and the tests then pass against a driver you no longer ship.
- Install with the pinned Bun version ([bun.md](bun.md#one-version)); a newer Bun can rewrite the lockfile in a form the pinned one cannot read.
- Read the changelog for behavior that tests pin, not only for breaking changes.
