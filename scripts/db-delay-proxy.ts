// A loopback TCP proxy that holds every chunk for a fixed time in each
// direction, so a local PostgreSQL answers like a pooler one network hop
// away. With it the cost of a round trip shows in local measurements the way
// it does in production, where each one is a few milliseconds. Without it
// local timings are bound by CPU and say little about a deployed page
// (docs/agents/speed.md).
//
//   bun scripts/db-delay-proxy.ts <listen port> <delay ms each way> [target port] [open ms]
//
// `open ms` also holds each new connection's first bytes that long, the way a
// pooler connection costs a TLS handshake and a password check before its
// first statement (about 250 ms in production), so a server that opens
// connections while a page waits shows it locally too.
//
// Then point the app at the listen port: the same POSTGRES_URL with its port
// changed, and DATABASE_POOL_MAX set to production's pool size.
import { connect, createServer } from 'node:net'; // Bun.listen cannot delay per chunk in order as simply

const [listen, delay, target = '5432', open = '0'] = process.argv.slice(2);
if (!listen || !delay) {
  console.error(
    'Usage: bun scripts/db-delay-proxy.ts <listen port> <delay ms each way> [target port] [open ms]',
  );
  process.exit(1);
}
const wait = Number(delay);
const opening = Number(open);

createServer((client) => {
  const upstream = connect(Number(target), '127.0.0.1');
  // One timer per chunk, all the same length, keeps the bytes in order; the
  // opening hold counts down from the connection's start, so every chunk
  // inside it leaves in order when it ends.
  const ready = performance.now() + opening;
  client.on('data', (chunk) =>
    setTimeout(
      () => upstream.write(chunk),
      wait + Math.max(0, ready - performance.now()),
    ),
  );
  upstream.on('data', (chunk) => setTimeout(() => client.write(chunk), wait));
  client.on('close', () => setTimeout(() => upstream.destroy(), wait));
  upstream.on('close', () => setTimeout(() => client.destroy(), wait));
  client.on('error', () => upstream.destroy());
  upstream.on('error', () => client.destroy());
}).listen(Number(listen), '127.0.0.1', () =>
  console.info(
    `Delaying ${wait} ms each way, ${opening} ms to open: :${listen} -> :${target}`,
  ),
);
