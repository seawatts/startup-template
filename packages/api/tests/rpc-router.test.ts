import { expect, test } from 'bun:test';
import { unlazy } from '@orpc/server';

// /api/rpc serves the lazily loaded router, so a cold server loads only the
// areas a request calls. It must serve exactly the app router's areas, each
// loading the same procedures: an area added to one and not the other
// either 404s in the browser or is missing from every client's types.
test('the lazily loaded router serves every area of the app router', async () => {
  // Loading the routers loads the database client, which wants a URL; no
  // query runs here.
  process.env.POSTGRES_URL ??= 'postgres://localhost:5432/unused';
  process.env.CI ??= 'true';
  const [{ appRouter }, { rpcRouter }] = await Promise.all([
    import('../src/root'),
    import('../src/rpc-router'),
  ]);
  expect(Object.keys(rpcRouter).sort()).toEqual(Object.keys(appRouter).sort());
  for (const [key, lazy] of Object.entries(rpcRouter)) {
    const { default: loaded } = await unlazy(lazy);
    expect(
      loaded === appRouter[key as keyof typeof appRouter]
        ? key
        : `${key} differs`,
    ).toBe(key);
  }
});
