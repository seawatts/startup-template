import { expect, test } from 'bun:test';

// The house standard: every read and write goes through an oRPC procedure,
// so the app, the public REST API, OpenAPI, the SDK, the CLI and the MCP
// server all get it from one contract (docs/agents/api.md). Two things would
// route around that, and this test refuses both:
//
// 1. A server action (`'use server'`). It is a second, private API that no
//    other interface can call, with its own auth and error handling.
// 2. A page, layout or template that reads data on the server. Pages are a
//    static frame; their parts read through oRPC with React Query on the
//    client. A server file may read the session to redirect or 404, nothing
//    more.

const root = `${import.meta.dir}/../..`;

// Generated code from a library, not ours.
const generated = ['packages/ai/src/baml_client/'];

async function files(pattern: string) {
  const found: string[] = [];
  for await (const path of new Bun.Glob(pattern).scan({ cwd: root }))
    if (
      !path.includes('/node_modules/') &&
      !generated.some((prefix) => path.startsWith(prefix))
    )
      found.push(path);
  return found;
}

test('no server actions', async () => {
  const offenders: string[] = [];
  for (const path of await files('{apps,packages}/*/src/**/*.{ts,tsx}')) {
    const text = await Bun.file(`${root}/${path}`).text();
    if (/^\s*['"]use server['"]/m.test(text)) offenders.push(path);
  }
  // Move each into a procedure in packages/api/src/router and call it with
  // useMutation(api.<area>.<name>.mutationOptions()).
  expect(offenders).toEqual([]);
});

// What a server page, layout or template may import from our packages: the
// session reader (to redirect), the operator check (to 404) and the catalog's
// own description, which the static API reference page is built from.
const allowedOnServer = new Set([
  '@seawatts/auth/session-reader',
  '@seawatts/api/operator/access',
  '@seawatts/api/operation-runtime',
  '@seawatts/api/operations',
]);
const dataModules =
  /from ['"](@seawatts\/db\/[^'"]+|@seawatts\/api\/(?!react\/)[^'"]+|@seawatts\/auth\/server|@seawatts\/stripe(?:\/[^'"]+)?)['"]/g;

test('pages, layouts and templates read no data on the server', async () => {
  const offenders: string[] = [];
  for (const path of await files(
    'apps/web-app/src/app/**/{page,layout,template,default,loading}.tsx',
  )) {
    const text = await Bun.file(`${root}/${path}`).text();
    if (/^\s*['"]use client['"]/m.test(text)) continue;
    for (const [, module] of text.matchAll(dataModules))
      if (module && !allowedOnServer.has(module))
        offenders.push(`${path} imports ${module}`);
    if (/prefetchQuery|HydrationBoundary|createCaller/.test(text))
      offenders.push(`${path} prefetches on the server`);
  }
  // Read it in a client component with useQuery(api.<area>.<name>.queryOptions()).
  expect(offenders).toEqual([]);
});
