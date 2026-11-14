import { timingSafeEqual } from 'node:crypto';
import { unlazy } from '@orpc/server';
import { rpcRouter } from '@seawatts/api/rpc-router';
import { connection } from '@seawatts/db/client';

// A cron pings /api/rpc/__warm (app/api/cron/warm): a server that has sat
// idle starts cold, and its first answer pays for loading the code and
// opening a database connection. The ping keeps one instance alive with
// every area's code loaded and a connection open, so the next person's
// first screen answers warm.
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
  // One query, outside any transaction: nothing is pipelined.
  await Promise.all([
    ...Object.values(rpcRouter).map((area) => unlazy(area)),
    connection`select 1`,
  ]);
  return Response.json(
    { ms: Math.round(performance.now() - started) },
    { headers: { 'Cache-Control': 'no-store' } },
  );
}
