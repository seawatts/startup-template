import { RPCHandler } from '@orpc/server/fetch';
import {
  BatchHandlerPlugin,
  StrictGetMethodPlugin,
} from '@orpc/server/plugins';
import { createORPCContext } from '@seawatts/api/context';
import { rpcRouter } from '@seawatts/api/rpc-router';
import { sharingRequestReads } from '@seawatts/db/request-reads';
import { isWarmPing, warmApi } from '~/server/warm-api';

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
  const { response } = await sharingRequestReads(shared, async () =>
    rpc.handle(request, {
      context: await createORPCContext(request.headers),
      prefix: '/api/rpc',
    }),
  );
  // Answers depend on who asks: never cached by a browser or a CDN.
  if (response) response.headers.set('Cache-Control', 'no-store');
  return response ?? new Response('Not found', { status: 404 });
}

export { handler as GET, handler as POST };
