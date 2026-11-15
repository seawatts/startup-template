import { expect, it } from 'bun:test';

// The module loads the database clients, which read their URL on import. No
// connection is opened: the pool connects on its first query.
process.env.POSTGRES_URL ||= 'postgres://app:app@127.0.0.1:1/app';
process.env.SKIP_ENV_VALIDATION ||= 'true';
const { openConnectionsAtStart } = await import('./warm-api');

const opened = (env: Record<string, string | undefined>) => {
  let calls = 0;
  const started = openConnectionsAtStart(env, () => {
    calls += 1;
    return [Promise.resolve()];
  });
  return { calls, started };
};

it('opens connections on a hosted server', () => {
  expect(opened({ VERCEL: '1' })).toEqual({ calls: 1, started: true });
});

it('opens none locally or during the build', () => {
  expect(opened({})).toEqual({ calls: 0, started: false });
  expect(opened({ NEXT_PHASE: 'phase-production-build', VERCEL: '1' })).toEqual(
    { calls: 0, started: false },
  );
});

it('a failed open is logged by code and never thrown', async () => {
  const logged: string[] = [];
  const error = console.error;
  console.error = (line: string) => logged.push(line);
  try {
    openConnectionsAtStart({ VERCEL: '1' }, () => [
      Promise.reject(Object.assign(new Error('secret host'), { code: 'X1' })),
    ]);
    await new Promise((resolve) => setTimeout(resolve, 5));
  } finally {
    console.error = error;
  }
  expect(logged).toEqual([
    JSON.stringify({ area: 'rpc.warm', code: 'X1', service: 'web' }),
  ]);
});
