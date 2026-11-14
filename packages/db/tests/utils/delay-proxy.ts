import { connect, createServer, type Socket } from 'node:net';

/**
 * A TCP proxy that holds every chunk for `delayMs` in each direction, so a
 * local database answers with a production-like round trip. Without it
 * serial queries look free locally and cost seconds once deployed.
 */
export async function delayProxy(target: URL, delayMs: number) {
  const sockets = new Set<Socket>();
  const forward = (from: Socket, to: Socket) => {
    from.on('data', (chunk) => {
      setTimeout(() => {
        if (!to.destroyed) to.write(chunk);
      }, delayMs);
    });
    from.on('close', () => setTimeout(() => to.destroy(), delayMs));
    from.on('error', () => to.destroy());
  };
  const server = createServer((client) => {
    const upstream = connect(Number(target.port || 5432), target.hostname);
    sockets.add(client).add(upstream);
    forward(client, upstream);
    forward(upstream, client);
  });
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('No port');
  const url = new URL(target);
  url.hostname = '127.0.0.1';
  url.port = String(address.port);
  return {
    close: () => {
      for (const socket of sockets) socket.destroy();
      server.close();
    },
    url: url.toString(),
  };
}
