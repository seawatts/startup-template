# Analytics and Internal for every feature

A feature is not finished until you can see it being used. A change that adds something people turn on, use, or that can fail carries both halves below in the same pull request. Skip a part only when it plainly has nothing to show (a copy fix, a refactor), and say so in the PR description.

## Product events (PostHog)

- The catalog is `packages/analytics/src/product-events.ts`: one `object_verbed` name per event, with the only properties it may carry. Properties are opaque ids, enums, counts and booleans. Never content, names, emails or free text; `productEventProperties` drops anything not listed and any string that does not look like an identifier.
- Every save (a procedure that is not a GET) has a row in `packages/api/src/product-events.ts`: its event, or `null` with the reason it is not product usage. `packages/api/tests/product-events.test.ts` fails on a save with no row. The oRPC middleware records the event after the save succeeds, so the app, REST, the SDK, the CLI and MCP are all covered by the one row; `surface` says which way in.
- Work that does not go through a procedure (a webhook, a workflow step, a cron) calls `captureProductEvent` from `@seawatts/analytics/capture` after its write commits. Pass a `dedupeKey` when it can be retried.
- UI-only moments (opened, revealed, switched tab) call `captureBrowserEvent` from `@seawatts/analytics/browser-event`. Do not call `posthog.capture` with an ad hoc name.
- Sending is best effort: after the response (`waitUntil`), never throws, and does nothing without `POSTHOG_KEY` and `POSTHOG_HOST`. In tests, `sendProductEventsTo` collects what would be sent.

## Internal (the operator console)

`/app/internal` is where the people who run the product see every customer. Its reads are `packages/api/src/router/operator.ts`.

- Access: `operatorProcedure` (`packages/api/src/operator/access.ts`) admits a signed-in person with a verified email and a row in the `operators` table, never an API key, and answers everyone else `NOT_FOUND`. The layout and the sidebar link only decide what to show; the page shell holds no data. Before real customers, require a second factor or a single sign-on domain and record each operator read.
- Organizations first: the organization, then its people and what it uses. What staff need about one customer goes on the organization page (`internal/_components/organization.tsx`) as a card; a whole new view is a new page under `internal/`.
- Operators are data, not configuration: `bun operators add <email>` (also `remove`, `list`; `packages/db/scripts/operators.ts`) for someone who has signed up, wrapped in `bun with-env` for a hosted database. Never a list of emails in an environment variable.
- Our own accounts are not customers. Every figure and list leaves them out unless Include internal is on: use `internalOrganization()` and `internalPerson()` from `packages/api/src/operator/internal-rules.ts` and keep the switch working.
- Each list is one bounded query with counts as subqueries, never a query per row. Never return a secret (a key's value, a token).
- Operator procedures are listed in `sessionOnly` in `operations.ts`: they are not part of the public API.
- Tests: `packages/api/tests/operator.test.ts` (needs `TEST_POSTGRES_URL`) covers who is admitted and that internal organizations are left out.
