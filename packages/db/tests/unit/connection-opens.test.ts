import { expect, it } from 'bun:test';
import { tracingChannel } from 'node:diagnostics_channel'; // the driver publishes its connection attempts here
import {
  connectionOpens,
  connectionOpensSince,
} from '../../src/connection-opens';

// The driver publishes each connection attempt on `postgres:connect`; the
// counter turns them into what a request logs.
const channel = tracingChannel('postgres:connect');
const pause = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

it('reports nothing for a request that opened no connection', () => {
  expect(connectionOpensSince(connectionOpens())).toBeNull();
});

it('counts connections opened, the slowest and the most at once', async () => {
  const before = connectionOpens();
  await Promise.all([
    channel.tracePromise(() => pause(30), {}),
    channel.tracePromise(() => pause(5), {}),
  ]);
  const opens = connectionOpensSince(before);
  expect(opens).toMatchObject({ failed: 0, opened: 2, peak: 2 });
  expect(opens?.slowest).toBeGreaterThanOrEqual(25);
  // The slowest and the peak start over for the next reader.
  const after = connectionOpens();
  expect(after.slowest).toBe(0);
  expect(after.peak).toBe(0);
});

it('counts a failed attempt as failed', async () => {
  const before = connectionOpens();
  await channel
    .tracePromise(() => Promise.reject(new Error('refused')), {})
    .catch(() => undefined);
  expect(connectionOpensSince(before)).toMatchObject({ failed: 1, opened: 0 });
});
