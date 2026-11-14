# Tests

Put a test in the suite its behavior needs, and check for existing coverage before adding one. Run what covers the change and report what actually ran.

## Where a test goes

| What is being verified | Where | Run |
| --- | --- | --- |
| Logic with no I/O (parsing, mapping, catalogs, rules) | `packages/<name>/tests/*.test.ts`, or beside the file | `bun test <path>` |
| Database behavior: constraints, transactions, the driver patch, the read guard | `packages/db/tests/unit`, skipped without `TEST_POSTGRES_URL` | `TEST_POSTGRES_URL=<disposable database> bun test packages/db/tests/unit` |
| Procedures, access rules, events, operator reads | `packages/api/tests`, database parts skipped without `TEST_POSTGRES_URL` | `bun test packages/api/tests` |
| Rendering, layout at both sizes, focus, dialogs, loading and error states | `apps/web-app/e2e/*.e2e.ts` (Playwright) | `bun test:e2e` |
| How fast a screen shows its content | `apps/web-app/e2e/speed.e2e.ts` | `SPEED=enabled bun test:e2e speed` |

- A check of an HTTP route, a webhook signature or response headers is not a browser test: call the handler or the running app with `fetch` from a `bun test` file. Do not start Chromium for it.
- Tests that share the process share the database connection: do not close it in `afterAll`. Clean up the rows you made.
- Never skip, loosen or delete a failing test to get green. Fix the cause, or say what blocks it.

## Browser tests

They run against an app that is already running, on the same database:

1. `bun run build` then `bun run start` in `apps/web-app` (or `bun dev:next`).
2. `E2E_BASE_URL=http://localhost:3000 bun test:e2e`, with `POSTGRES_URL` and `BETTER_AUTH_SECRET` set to the app's values.

- `e2e/fixtures.ts` gives each test its own signed-in person, organization and first API key, written straight to the database with a signed session cookie. No sign-in form, no shared account, and the rows are removed afterwards.
- Every test runs in two projects, `desktop` (1280px) and `phone` (390px). For a changed screen assert the content, and that nothing scrolls sideways.
- Wait for what a person would see (`expect(locator).toBeVisible()`), never `networkidle`: analytics keeps the network busy.
- Files end in `.e2e.ts` so `bun test` leaves them alone. Playwright stays at the version in `apps/web-app/package.json`.

## The speed measurement

`speed.e2e.ts` loads each listed screen as a signed-in person with a network round trip in front of every request, and reports the median time from navigation to content shown, plus every API request on the way with when it was sent and how long it took.

- `SPEED_RTT` (default 60 ms), `SPEED_LOADS` (default 5), `SPEED_CPU` (4 is about a mid-range phone), `SPEED_BUDGET` (fail above this many ms; unset reports only).
- Start the built app with `STATEMENT_COUNTS=enabled` and each request also lists its server time, statements and transactions, with a total per screen; `SPEED_SERVER_BUDGET=100` fails a screen whose server time is over the budget.
- It is a measurement, not a check: it runs only with `SPEED=enabled`. Run it before and after a change to a screen or its reads, on a built app (`next start`, never dev), and put both tables in the pull request.
- Add a screen to `screens` with the feature that adds it: its path and the selector that means "content shown" (a row, not a skeleton).
- Read the request list as well as the number: the same request twice, a read sent late, or a chain of reads each waiting on the last is the thing to fix ([speed.md](speed.md)).
