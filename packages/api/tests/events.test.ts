import { afterAll, describe, expect, test } from 'bun:test';
import {
  deliverEventsWith,
  publishEvent,
  takeUndeliveredEvents,
} from '../src/events/publish';

test('an event with nothing to deliver it is kept for the test to read', async () => {
  takeUndeliveredEvents();
  await publishEvent('apiKey.expired', {
    apiKeyId: 'ak_1',
    organizationId: 'org_1',
  });
  const [event, ...rest] = takeUndeliveredEvents();
  expect(rest).toEqual([]);
  expect(event).toMatchObject({
    name: 'apiKey.expired',
    payload: { apiKeyId: 'ak_1', organizationId: 'org_1' },
  });
  expect(event?.id).toStartWith('evt_');
  expect(takeUndeliveredEvents()).toEqual([]);
});

test('a failed hand-off is reported, never thrown at the save', async () => {
  const errors: unknown[] = [];
  const original = console.error;
  console.error = (line: unknown) => errors.push(line);
  try {
    deliverEventsWith(async () => {
      throw new Error('queue down');
    });
    await publishEvent('apiKey.expired', {
      apiKeyId: 'ak_1',
      organizationId: 'org_1',
    });
  } finally {
    console.error = original;
    delete (globalThis as { __deliverDomainEvent?: unknown })
      .__deliverDomainEvent;
  }
  expect(JSON.parse(String(errors[0]))).toMatchObject({
    error: 'queue down',
    event: 'domain_event_undelivered',
    name: 'apiKey.expired',
  });
});

test('a GET procedure runs as a read, a save does not', async () => {
  process.env.POSTGRES_URL ??= 'postgres://localhost:5432/unused';
  process.env.CI ??= 'true';
  const [{ createRouterClient }, { publicProcedure }, { currentRead }] =
    await Promise.all([
      import('@orpc/server'),
      import('../src/orpc'),
      import('@seawatts/db/read-only'),
    ]);
  const probe = createRouterClient(
    {
      probe: {
        read: publicProcedure
          .route({ method: 'GET' })
          .handler(() => currentRead() ?? null),
        save: publicProcedure.handler(() => currentRead() ?? null),
      },
    },
    { context: {} as never },
  );
  expect(await probe.probe.read()).toBe('rpc.probe.read');
  expect(await probe.probe.save()).toBeNull();
});

// Needs a real PostgreSQL with the migrations applied: TEST_POSTGRES_URL.
const url = process.env.TEST_POSTGRES_URL;

// The connection is shared by every test file in the run and left open.
describe.skipIf(!url)('with a database', () => {
  process.env.POSTGRES_URL = url;
  process.env.CI ??= 'true';
  const loaded = Promise.all([
    import('@seawatts/db/auth-client').then(({ authDb }) => ({ db: authDb })),
    import('@seawatts/db/schema/api-keys'),
    import('@seawatts/db/schema/organizations'),
    import('@seawatts/db/schema/users'),
    import('../src/services/api-key-expiry'),
    import('../src/caller'),
    import('../src/api-key-context'),
  ]);
  const suffix = Date.now().toString(36);
  const userId = `user_events_${suffix}`;
  const orgId = `org_events_${suffix}`;
  const seeded = loaded.then(async ([{ db }, , { Orgs }, { Users }]) => {
    await db.insert(Users).values({
      email: `${userId}@example.com`,
      id: userId,
      name: 'Events Test',
    });
    await db.insert(Orgs).values({ id: orgId, name: orgId });
  });
  afterAll(async () => {
    const [{ db }, , { Orgs }, { Users }] = await loaded;
    const { eq } = await import('drizzle-orm');
    await db.delete(Orgs).where(eq(Orgs.id, orgId));
    await db.delete(Users).where(eq(Users.id, userId));
  });

  test('a key is switched off once, and only when it is due', async () => {
    await seeded;
    const [, { ApiKeys }, , , { expireApiKeyIfDue }] = await loaded;
    const { inTenant } = await import('@seawatts/db/transaction');
    const soon = new Date(Date.now() + 60_000);
    const [key] = await inTenant(orgId, (tx) =>
      tx
        .insert(ApiKeys)
        .values({
          expiresAt: soon,
          name: 'expiring',
          organizationId: orgId,
          userId,
        })
        .returning(),
    );
    if (!key) throw new Error('no key');
    expect(await expireApiKeyIfDue(key.id)).toEqual({
      status: 'waiting',
      until: soon.toISOString(),
    });
    const later = new Date(soon.getTime() + 1);
    expect(await expireApiKeyIfDue(key.id, later)).toEqual({
      organizationId: orgId,
      status: 'expired',
    });
    // A retry or a second workflow for the same key finds nothing to do.
    expect(await expireApiKeyIfDue(key.id, later)).toEqual({
      status: 'nothing_due',
    });
    expect(await expireApiKeyIfDue('ak_missing')).toEqual({
      status: 'nothing_due',
    });
  });

  test('a run wakes within a week, and stops when the expiry moved', async () => {
    const [, , , , { longestSleepMs, nextExpiryWake }] = await loaded;
    const now = Date.parse('2026-01-01T00:00:00.000Z');
    const tomorrow = '2026-01-02T00:00:00.000Z';
    const nextMonth = '2026-02-01T00:00:00.000Z';
    expect(nextExpiryWake(tomorrow, tomorrow, now)).toEqual({
      replaced: false,
      wakeAt: tomorrow,
    });
    expect(nextExpiryWake(nextMonth, nextMonth, now)).toEqual({
      replaced: false,
      wakeAt: new Date(now + longestSleepMs).toISOString(),
    });
    // The key now expires at another time: a newer run owns it.
    expect(nextExpiryWake(nextMonth, tomorrow, now)).toEqual({
      replaced: true,
    });
  });

  test('saving an expiry publishes it, and only then', async () => {
    await seeded;
    const [, , , , , { createCaller }, { apiKeyContext }] = await loaded;
    const api = createCaller(
      apiKeyContext({ apiKeyId: 'ak_caller', orgId, userId }),
    );
    takeUndeliveredEvents();
    const expiresAt = new Date(Date.now() + 3_600_000);
    const key = await api.apiKeys.create({ expiresAt, name: 'with expiry' });
    await api.apiKeys.create({ name: 'no expiry' });
    if (!key) throw new Error('no key');
    await api.apiKeys.update({ expiresAt: null, id: key.id });
    await api.apiKeys.update({ id: key.id, name: 'renamed' });
    expect(
      takeUndeliveredEvents().map(({ name, payload }) => ({ name, payload })),
    ).toEqual([
      {
        name: 'apiKey.expirySet',
        payload: {
          apiKeyId: key.id,
          expiresAt: expiresAt.toISOString(),
          organizationId: orgId,
        },
      },
      {
        name: 'apiKey.expirySet',
        payload: { apiKeyId: key.id, expiresAt: null, organizationId: orgId },
      },
    ]);
  });

  test('an API key is found before its organization is known, and only while it is on', async () => {
    await seeded;
    const [, , , , , { createCaller }, { apiKeyContext, readApiKey }] =
      await loaded;
    const api = createCaller(
      apiKeyContext({ apiKeyId: 'ak_caller', orgId, userId }),
    );
    const key = await api.apiKeys.create({ name: 'for a header' });
    if (!key) throw new Error('no key');
    const bearer = (token: string) =>
      new Headers({ authorization: `Bearer ${token}` });
    expect(await readApiKey(bearer(key.key))).toEqual({
      apiKeyId: key.id,
      orgId,
      userId,
    });
    expect(await readApiKey(bearer('usk-live-unknown'))).toBeNull();
    await api.apiKeys.update({ id: key.id, isActive: false });
    expect(await readApiKey(bearer(key.key))).toBeNull();
  });
});
