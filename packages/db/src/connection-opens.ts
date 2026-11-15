// How many database connections this server has opened and how long the
// slowest took. A pooler connection costs a TLS handshake and a password
// check before its first statement, and a server that opens them while a
// page waits shows up here: `/api/rpc` logs the numbers for any request
// during which connections were opened (docs/agents/speed.md).
//
// node:diagnostics_channel because the driver publishes its connection
// attempts there and Bun has no primitive of its own for it.
import { tracingChannel } from 'node:diagnostics_channel';

const opens = { failed: 0, opened: 0, opening: 0, peak: 0, slowest: 0 };
const started = new WeakMap<object, number>();

const ignore = () => undefined;
tracingChannel('postgres:connect').subscribe({
  asyncEnd(message) {
    const context = message as object;
    const at = started.get(context);
    if (at === undefined) return;
    started.delete(context);
    opens.opening -= 1;
    if ((context as { error?: unknown }).error) opens.failed += 1;
    else opens.opened += 1;
    opens.slowest = Math.max(opens.slowest, Math.round(performance.now() - at));
  },
  // The attempt is counted when it settles (`asyncEnd`), failed or not.
  asyncStart: ignore,
  end: ignore,
  error: ignore,
  start(message) {
    started.set(message as object, performance.now());
    opens.opening += 1;
    opens.peak = Math.max(opens.peak, opens.opening);
  },
});

/**
 * Totals since the server started; `slowest` and `peak` since the last
 * `connectionOpensSince`.
 */
export function connectionOpens() {
  return { ...opens };
}

/**
 * What changed since an earlier `connectionOpens()`: connections opened and
 * failed, the slowest one in milliseconds and the most being opened at once.
 * Null when none were. Resets the slowest and the peak for the next reader.
 */
export function connectionOpensSince(
  before: ReturnType<typeof connectionOpens>,
) {
  const opened = opens.opened - before.opened;
  const failed = opens.failed - before.failed;
  if (!opened && !failed) return null;
  const result = { failed, opened, peak: opens.peak, slowest: opens.slowest };
  opens.peak = opens.opening;
  opens.slowest = 0;
  return result;
}
