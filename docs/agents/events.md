# Events, workflows and reads that never write

Work that follows from a change belongs to the change. A save publishes what happened; handlers react as durable workflow steps; anything due later is a workflow that sleeps until then. Nothing is done "on the way" by a page load, and nothing is found later by a sweep.

## A read never writes

Loading a page or calling a GET procedure changes nothing: no backfilling, no "create on first visit", no marking seen, no materializing derived rows.

- Every GET procedure runs inside `readingOnly` (`packages/db/src/read-only.ts`, wired in `packages/api/src/orpc.ts`). The database client refuses a writing statement (by verb, or a data-modifying CTE) before it is sent. Tests and development throw `WriteInReadError`; production logs `write_in_read` and lets it through, so a missed path is found without breaking the page.
- Wrap any other read path the same way: `readingOnly('page.dashboard', () => load())`.
- A record of the request itself (API key last used, a flag exposure, an error report) opts out with `notReading(() => …)`. Never use it for a change to the data.
- Not `begin read only`: a read may take `FOR SHARE` or advisory locks, which a read-only transaction refuses.
- A read that must name something not stored yet gives it a stable id (a hash of its natural key); the save that acts on it stores it under that id first.

## Publish what happened

- Event names and payloads are in `packages/api/src/events/catalog.ts`: past tense (`apiKey.expirySet`), ids plus the few facts a handler needs, plain JSON.
- A procedure calls `publishEvent(name, payload)` after its write has committed: after `inTransaction` returns, never inside the callback. An event for a rolled-back write starts work on rows that do not exist.
- The procedure does not know who reacts. Do not call the reaction inline, and do not leave it for a read or a cron to notice.
- In tests nothing delivers events; assert on `takeUndeliveredEvents()`.

## One map, durable handlers

`apps/web-app/src/workflows/event-handlers.ts` is the one map from each event to its named handlers. Each published event starts one `eventWorkflow` run (Vercel Workflow), and each handler is a step of its own: retried alone, and a failure names it.

A handler:

- is idempotent. A retry or a duplicate event changes nothing: make the write conditional (`where isActive and expiresAt <= now`) or unique on a natural key (subject + kind + period, `on conflict do nothing`), and pass `event.id` as the idempotency key to outside services;
- reads the rows as they are now, not as the event described them;
- stays thin: logic lives in a service in `packages/api`, loaded inside the handler.

## Later is a workflow that sleeps

A time-based effect is one workflow per subject, started when the data it depends on is written. It sleeps until the moment, reads its data again when it wakes, acts or sleeps again, and ends.

The example: `apiKeys.create` and `apiKeys.update` publish `apiKey.expirySet`; its handler starts `apiKeyExpiryWorkflow` (`workflows/api-key-expiry.ts`), which sleeps until the expiry and switches the key off through `expireApiKeyIfDue`. Moving the expiry starts a second run; both read the current row and the switch-off matches only a key that is still on and due, so the extra run finds nothing to do.

## Crons, triggers

- A cron is for truly periodic work (a digest, a warm ping). A sweep over everything is at most a safety net that reports what it finds; if it ever finds something, an event or a workflow is missing.
- Keep business logic out of database triggers and `pg_cron`: it cannot be tested, retried or seen with the rest.

## Running it

- `withWorkflow` in `apps/web-app/next.config.ts` compiles `'use workflow'` and `'use step'` functions; keep them in `apps/web-app/src/workflows`. Workflow functions only orchestrate (steps, `sleep`); everything with I/O is a step.
- `instrumentation.ts` registers delivery (`server/event-delivery.ts`). The proxy matcher skips `/.well-known/workflow/`.
- Locally runs are files under `apps/web-app/.next/workflow-data`; on Vercel they show under the project's Workflows tab. No extra environment variables.
- Tests: `packages/db/tests/unit/read-only.test.ts`, `packages/api/tests/events.test.ts` (database parts need `TEST_POSTGRES_URL`). After changing a workflow, run the built app, make the save and watch the run finish.
