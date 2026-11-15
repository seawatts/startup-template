import { expect, test } from 'bun:test';
import { sendProductEventsTo } from '@seawatts/analytics/capture';
import {
  productEventProperties,
  productEvents,
} from '@seawatts/analytics/product-events';
import { productEventFor } from '../src/product-events';

process.env.POSTGRES_URL ??= 'postgres://localhost:5432/unused';
process.env.CI ??= 'true';

type Procedure = { '~orpc': { route: { method?: string } } };

test('every save names its product event, or says why it has none', async () => {
  const { appRouter } = await import('../src/root');
  const saves: string[] = [];
  for (const [area, router] of Object.entries(appRouter))
    for (const [name, node] of Object.entries(router))
      if ((node as Procedure)['~orpc'].route.method !== 'GET')
        saves.push(`${area}.${name}`);
  expect(saves.filter((name) => !productEventFor[name])).toEqual([]);
  // No entry for a procedure that is gone or became a read.
  expect(
    Object.keys(productEventFor).filter((name) => !saves.includes(name)),
  ).toEqual([]);
  for (const mapping of Object.values(productEventFor))
    if (mapping.event) expect(productEvents).toHaveProperty(mapping.event);
    else expect(mapping.reason.length).toBeGreaterThan(5);
});

test('only allowlisted, content-free properties are kept', () => {
  expect(
    productEventProperties('api_key_created', {
      has_expiry: true,
      name: 'Production key',
    }),
  ).toEqual({ has_expiry: true });
  // A string must look like an identifier, never a sentence.
  expect(
    productEventProperties('api_key_visibility_toggled', {
      visible: 'whatever a person typed here',
    }),
  ).toEqual({});
  expect(
    productEventProperties('api_key_visibility_toggled', { visible: true }),
  ).toEqual({ visible: true });
});

test('a save records its event with ids and the surface; a read records nothing', async () => {
  const sent: unknown[] = [];
  sendProductEventsTo((event) => {
    sent.push(event);
  });
  try {
    const [{ createRouterClient }, { publicProcedure }] = await Promise.all([
      import('@orpc/server'),
      import('../src/orpc'),
    ]);
    const context = {
      apiKey: null,
      auth: { orgId: 'org_1', userId: 'user_1' },
    } as never;
    const api = createRouterClient(
      {
        apiKeys: {
          all: publicProcedure.route({ method: 'GET' }).handler(() => []),
          create: publicProcedure.handler(() => ({ id: 'ak_1' })),
        },
      },
      { context },
    );
    await api.apiKeys.all();
    await api.apiKeys.create();
    await new Promise((resolve) => setTimeout(resolve, 10));
  } finally {
    sendProductEventsTo(null);
  }
  expect(sent).toEqual([
    {
      distinctId: 'user_1',
      event: 'api_key_created',
      groups: { organization: 'org_1' },
      properties: { has_expiry: false, surface: 'web' },
    },
  ]);
});

test('every procedure call records one timing event, failed calls too', async () => {
  const sent: { event: string; properties: Record<string, unknown> }[] = [];
  sendProductEventsTo((event) => {
    sent.push(event);
  });
  const [{ createRouterClient }, { publicProcedure, recordTimingsInTests }] =
    await Promise.all([import('@orpc/server'), import('../src/orpc')]);
  recordTimingsInTests(true);
  try {
    const api = createRouterClient(
      {
        apiKeys: {
          all: publicProcedure.route({ method: 'GET' }).handler(() => []),
          broken: publicProcedure.route({ method: 'GET' }).handler(() => {
            throw new Error('no');
          }),
        },
      },
      { context: { apiKey: null, auth: { orgId: 'org_1' } } as never },
    );
    await api.apiKeys.all();
    await api.apiKeys.broken().catch(() => undefined);
    await new Promise((resolve) => setTimeout(resolve, 10));
  } finally {
    recordTimingsInTests(false);
    sendProductEventsTo(null);
  }
  // Unordered: the sends are not awaited.
  const timings = sent
    .filter((event) => event.event === 'procedure_timed')
    .map(({ properties }) => ({ ...properties, ms: typeof properties.ms }))
    .sort((a, b) => String(a.path).localeCompare(String(b.path)));
  expect(timings).toEqual([
    {
      $process_person_profile: false,
      ms: 'number',
      ok: true,
      path: 'apiKeys.all',
      statements: 0,
      surface: 'web',
      transactions: 0,
      waited_ms: 0,
    },
    {
      $process_person_profile: false,
      ms: 'number',
      ok: false,
      path: 'apiKeys.broken',
      statements: 0,
      surface: 'web',
      transactions: 0,
      waited_ms: 0,
    },
  ]);
});
