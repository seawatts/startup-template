import { RPCHandler } from '@orpc/server/fetch';
import {
  BatchHandlerPlugin,
  StrictGetMethodPlugin,
} from '@orpc/server/plugins';
import { createORPCContext } from '@seawatts/api/context';
import { rpcRouter } from '@seawatts/api/rpc-router';
import {
  connectionOpens,
  connectionOpensSince,
} from '@seawatts/db/connection-opens';
import { sharingRequestReads } from '@seawatts/db/request-reads';
import {
  countingStatements,
  countsStatements,
  serverTiming,
} from '@seawatts/db/statement-count';
import { isWarmPing, openConnectionsAtStart, warmApi } from '~/server/warm-api';

// A fresh server opens its database connections now, while nobody waits
// (hosted only; docs/agents/speed.md).
openConnectionsAtStart();

// The web app sends a screen's reads as one batch (packages/api
// react/config.ts); each read in it is still checked and answered on its
// own. Only a procedure marked `.route({ method: 'GET' })` answers a GET,
// so a link or an image tag can never trigger a write.
const rpc = new RPCHandler(rpcRouter, {
  plugins: [
    new BatchHandlerPlugin({ maxSize: 20 }),
    new StrictGetMethodPlugin(),
  ],
});

async function handler(request: Request) {
  if (isWarmPing(request)) return warmApi(request);
  // A write from another site's page is refused. Clients with no Origin
  // header (the CLI, the mobile app) are not browsers and carry no ambient
  // cookie.
  const origin = request.headers.get('origin');
  if (
    request.method !== 'GET' &&
    origin &&
    origin !== new URL(request.url).origin
  )
    return new Response('Origin mismatch', { status: 403 });
  // A screen's reads arrive as one GET batch and share their "who is
  // asking" lookups (`requestRead` in packages/db request-reads.ts). Writes
  // share nothing.
  const shared = request.method === 'GET' ? new Map() : undefined;
  const opensBefore = connectionOpens();
  const began = performance.now();
  const answer = async () => {
    const result = await sharingRequestReads(shared, async () =>
      rpc.handle(request, {
        context: await createORPCContext(request.headers),
        prefix: '/api/rpc',
      }),
    );
    // A request during which this server opened connections says so: how
    // many, the slowest, how many at once and how long the server has been
    // up, so a slow first screen on a fresh server is told apart from slow
    // queries. Numbers only.
    const opens = connectionOpensSince(opensBefore);
    if (opens)
      console.info(
        JSON.stringify({
          event: 'rpc.connections',
          ms: Math.round(performance.now() - began),
          up: Math.round(process.uptime()),
          ...opens,
        }),
      );
    return result;
  };
  // In development every answer says how long the server took and how many
  // statements and transactions it sent (the browser's network panel shows
  // it under Timing, and the speed measurement adds it up per screen).
  if (!countsStatements()) return finish((await answer()).response);
  const started = performance.now();
  const { counts, result } = await countingStatements(answer);
  result.response?.headers.set(
    'Server-Timing',
    serverTiming(performance.now() - started, counts),
  );
  return finish(result.response);
}

function finish(response: Response | undefined) {
  // Answers depend on who asks: never cached by a browser or a CDN.
  if (response) response.headers.set('Cache-Control', 'no-store');
  return response ?? new Response('Not found', { status: 404 });
}

export { handler as GET, handler as POST };
