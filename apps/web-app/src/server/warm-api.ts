import { timingSafeEqual } from 'node:crypto';
import { unlazy } from '@orpc/server';
import { rpcRouter } from '@seawatts/api/rpc-router';
import { authConnection } from '@seawatts/db/auth-client';
import { connection } from '@seawatts/db/client';
import { poolMax } from '@seawatts/db/connection-config';

// The roles a request uses. Two roles that share a URL share one pool.
const pools = () => [...new Set([connection, authConnection])];

// A pool's worth of queries per role at once, outside any transaction, so
// each pool opens (or keeps) every connection it may hold: a screen's reads
// arrive together, and every connection a pool has to open while they wait
// costs a TLS handshake and the role's password check (about 250 ms through
// a pooler). A pooler client connection holds no Postgres backend while
// idle, so keeping them open costs the database nothing.
const fill = () =>
  pools().flatMap((sql) =>
    Array.from({ length: poolMax() }, () => sql`select 1`),
  );

/**
 * Opens each role's connections when the server starts, not when its first
 * page asks: a fresh server's first screen otherwise waits for every
 * connection it needs to open, one stage after another (measured with a
 * 250 ms open: docs/agents/speed.md). Hosted servers only: a local
 * connection is a Postgres backend, shared with everything else on the
 * machine. Never during the build, which loads this module too.
 */
export function openConnectionsAtStart(
  env: Record<string, string | undefined> = process.env,
  open: () => Promise<unknown>[] = fill,
) {
  if (env.VERCEL !== '1' || env.NEXT_PHASE === 'phase-production-build')
    return false;
  // A failure here is not a request's: the first read reports its own. Only
  // a code is logged, never the connection's details.
  Promise.all(open()).catch((error: unknown) =>
    console.error(
      JSON.stringify({
        area: 'rpc.warm',
        code: (error as { code?: string })?.code ?? 'CONNECT_FAILED',
        service: 'web',
      }),
    ),
  );
  return true;
}

// A cron pings /api/rpc/__warm (app/api/cron/warm): a server that has sat
// idle starts cold, and its first answer pays for loading the code and
// opening its database connections. The ping keeps one instance alive with
// every area's code loaded and each role's connections open, so the next
// person's first screen answers warm.
export function isWarmPing(request: Request) {
  return (
    request.method === 'GET' &&
    new URL(request.url).pathname === '/api/rpc/__warm'
  );
}

const sameSecret = (given: string, expected: string) => {
  const a = Buffer.from(given);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
};

export async function warmApi(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (
    !secret ||
    !sameSecret(request.headers.get('authorization') ?? '', `Bearer ${secret}`)
  )
    return new Response('Unauthorized', { status: 401 });
  const started = performance.now();
  // Each role's connections (`fill`): the ping refreshes their idle timer.
  // Outside any transaction and one query per connection, so nothing is
  // pipelined.
  const connections = Promise.all(fill());
  // Every area's code, one area at a time with a turn of the event loop
  // between them. On a fresh server loading every area is seconds of module
  // evaluation; loading them all at once holds the event loop for all of it,
  // so a person's first reads that reach this server meanwhile wait behind
  // the whole router (docs/agents/speed.md).
  for (const area of Object.values(rpcRouter)) {
    await unlazy(area);
    await new Promise((resolve) => setTimeout(resolve, 0));
  }
  await connections;
  return Response.json(
    { ms: Math.round(performance.now() - started) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
