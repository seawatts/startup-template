# Observability

How the app is watched in production and measured in development. CLAUDE.md keeps one line per rule; this is the detail. Where the template already does a part, the section names the file; the rest is the rule to follow when that part is built.

## One tool, content-free
- PostHog holds product analytics, error tracking and LLM traces, so a person, an error and a trace join on the same opaque ids.
- Allowed in any event or error: opaque ids (user, workspace, session, turn), enums, counts, durations, booleans, versions. Not allowed: names, emails, message text, transcripts, prompts, model output, file names users chose, URLs with user data in their query.
- Event names are `area.object_verb` in past tense (`session.ended`, `reminder.fired`, `praise.sent`), declared in one events file with their property types.

## Errors
- Every surface reports: server routes and procedures, the browser, background workers, bots, scheduled jobs and workflow steps. Wrap each entry point (route handler, procedure middleware, job runner, bot event handler) so nothing reports by hand.
- Each report carries `service` (web, worker, bot), `area` (`rpc.badges.list`, `cron.digest`, `discord.voice`), `release` (git sha), a short machine `code` (`TIMEOUT`, `WRITE_IN_READ`, `PROVIDER_429`) and in-app stack frames (upload source maps; mark library frames as not in-app).
- Group by service + area + type + code, so one cause is one group and a new group means something new broke.
- A daily triage summarizes the new error groups and what was done about each.
- Expected outcomes (validation errors, not found, forbidden) are not errors. Report them as events if they matter.
- A read that writes reports itself as `write_in_read` ([events.md](events.md)).
- A procedure or job still running near the platform's time limit reports itself as a timeout, because the platform's kill skips your catch.

## Product events
- Every user action fires a server event after commit and, where the moment is UI-only, a client event.
- Every domain event (the ones the workflow handlers listen to) also fires an analytics event, from the same place it is published.
- One map from mutation or domain event to analytics event; a check fails when a new mutation or domain event has no entry, or says why it is exempt (`packages/api/src/product-events.ts`; [analytics-internal.md](analytics-internal.md)).
- Server events go out after the response (`waitUntil`/`after`), never in the request path.

## Third-party and platform events
- Webhooks, OAuth callbacks, email sends and bounces, bot gateway events (Discord joins, leaves, commands), app installs and uninstalls are logged as content-free events with their source, type and outcome, including the ones the product ignores. That's how you find out a provider started sending something new, or stopped sending something you rely on.

## LLM and agent tracing
- One trace per turn (a user message and everything it caused). Spans:
  - each model call: provider, model, prompt version, input/output/cached tokens, cost, latency, time to first token, finish reason;
  - each tool or MCP call: tool name, outcome (ok, error, refused, timeout), latency;
  - retrieval: number of results and top score, not the text.
- Every LLM event carries the prompt version (a hash or release tag of the system prompt and tool catalog), so evals and live quality can be compared by version.
- Turn outcome is recorded once at the end: answered, refused, failed, interrupted, handed to a person.

## Agent quality loop
- Collect user feedback (thumbs, corrections), eval grades and automatic verdicts (an LLM judge or rule checks) as events on the turn.
- Keep an eval set in the repo. Every real failure that is fixed adds a case. Run it on prompt, model or tool changes and on a schedule, and link the run in the PR.
- Compare live outcome rates by prompt version after each release.

## Database
- Production: `log_min_duration_statement` around 200 ms per runtime role, with bind parameters off (`log_parameter_max_length = 0`) so the log holds the query's shape, never its values; tag the area (`application_name` or a comment) so a slow query maps to a procedure.
- Development: every API answer carries a `Server-Timing` header with its server time, content statements, wrapper statements (begin, commit, settings) and transactions (`packages/db/src/statement-count.ts`; [database.md](database.md#measuring)). Keep the numbers for speed PRs.
- Record pool waits, connection timeouts and connection errors as metrics or events per role, so pool exhaustion shows up before users report it.

## App
- Page views, page load speed (web vitals sent as numbers; drop the raw entries, which can name an element) and every save are events.

## Health
- An hourly heartbeat makes one cheap authenticated call to each dependency (database, model gateway, email, chat platform, payments) and records the outcome as an event: ok, down, refused key, low credit, expiring.
- Where something runs every minute (a bot, a worker), it also notices a dependency down for two minutes and a second instance running, and records both.

## Delivery is verified
- A test drives each declared event's trigger and asserts the event was captured (a fake capture client in tests).
- A daily check lists key events with zero volume in the last day that normally have some, and alerts.

## Alerts and dashboards
- Declare alerts, insights and dashboards in a script in the repo, applied with a scoped API key and matched by name, so a rerun updates and never duplicates; never build them by hand. A test fails when a monitor reads an event the catalog doesn't declare.
- Alerts reach the owner by email or DM for: a new error group, an error-rate spike, failed jobs or workflow steps, a dependency that's down, a refused key, low credit or a key close to expiring, a duplicate instance, a quiet heartbeat, zero-volume key events, and AI or infrastructure cost spikes.
- Four dashboards: Health (errors, failures, dependency checks), Agent quality (turn and tool outcomes, finish reasons, prompt versions, ratings, eval grades), Activity (page views, page speed, domain events, webhooks) and Cost (model and infrastructure spend).
- Exclude internal and test accounts from product dashboards by default.

## Logs
- Structured JSON, one object per line, with `request_id`, `trace_id`, `service`, `area` and `level`.
- Make recent logs readable to Claude through an MCP connector (the host's runtime-logs connector or the analytics tool's logs), with the same redaction.
- Never log secrets, tokens, headers that carry them, or user content. Redact in the logger, not at each call site.

## Next.js setup
- `instrumentation.ts` `register()` sets up error tracking and tracing for the server with `await import()`, so the SDKs don't load on every cold start before they're needed; `onRequestError` reports server render and route errors.
- The browser client initializes once in the root layout, with session recording and autocapture configured to mask text and inputs.
