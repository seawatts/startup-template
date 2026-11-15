import { afterAll, describe, expect, test } from 'bun:test';

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
    import('../src/caller'),
    import('@seawatts/db/schema/operators'),
  ]);
  const suffix = Date.now().toString(36);
  const staff = {
    email: `staff-${suffix}@example.com`,
    emailVerified: true,
    id: `user_staff_${suffix}`,
    name: 'Staff',
  };
  const customer = {
    email: `customer-${suffix}@example.com`,
    emailVerified: true,
    id: `user_customer_${suffix}`,
    name: 'Customer',
  };
  const unverified = {
    email: `unverified-${suffix}@example.com`,
    emailVerified: false,
    id: `user_unverified_${suffix}`,
    name: 'Unverified',
  };
  const ours = `org_ours_${suffix}`;
  const theirs = `org_theirs_${suffix}`;
  const seeded = loaded.then(
    async ([{ db }, { ApiKeys }, { OrgMembers, Orgs }, { Users }, , ops]) => {
      await db.insert(Users).values([staff, customer, unverified]);
      // Access is a row in `operators`, and a verified email.
      await db.insert(ops.Operators).values([
        { addedBy: 'test', userId: staff.id },
        { addedBy: 'test', userId: unverified.id },
      ]);
      await db.insert(Orgs).values([
        { id: ours, name: `Ours ${suffix}` },
        { id: theirs, name: `Theirs ${suffix}` },
      ]);
      await db.insert(OrgMembers).values([
        { organizationId: ours, role: 'owner', userId: staff.id },
        { organizationId: theirs, role: 'owner', userId: customer.id },
      ]);
      // A tenant row: written inside its organization, as the web role.
      const { inTenant } = await import('@seawatts/db/transaction');
      await inTenant(theirs, (tx) =>
        tx.insert(ApiKeys).values({
          name: 'Their key',
          organizationId: theirs,
          userId: customer.id,
        }),
      );
    },
  );
  afterAll(async () => {
    const [{ db }, , { Orgs }, { Users }] = await loaded;
    const { inArray } = await import('drizzle-orm');
    await db.delete(Orgs).where(inArray(Orgs.id, [ours, theirs]));
    await db
      .delete(Users)
      .where(inArray(Users.id, [staff.id, customer.id, unverified.id]));
  });

  const as = async (user: typeof staff | null, apiKey = false) => {
    const [{ db }, , , , { createCaller }] = await loaded;
    return createCaller({
      apiKey: apiKey ? { id: 'ak_1' } : null,
      auth: { orgId: null, userId: user?.id ?? null },
      authDb: db,
      organizationId: null,
      session: null,
      user,
    } as never);
  };

  test('only an operator session reads across organizations', async () => {
    await seeded;
    const refused = async (call: Promise<unknown>) =>
      call.then(
        () => 'allowed',
        (error: { code?: string }) => error.code,
      );
    expect(await refused((await as(customer)).operator.organizations({}))).toBe(
      'NOT_FOUND',
    );
    expect(
      await refused((await as(staff, true)).operator.organizations({})),
    ).toBe('NOT_FOUND');
    expect(
      await refused((await as(unverified)).operator.organizations({})),
    ).toBe('NOT_FOUND');
    expect(await refused((await as(null)).operator.overview({}))).toBe(
      'UNAUTHORIZED',
    );
    expect(await (await as(customer)).operator.access()).toEqual({
      operator: false,
    });
    expect(await (await as(staff)).operator.access()).toEqual({
      operator: true,
    });
  });

  test('lists leave our own organizations out unless asked, and never return a key', async () => {
    await seeded;
    const api = await as(staff);
    const customers = await api.operator.organizations({ search: suffix });
    expect(customers.map((row) => row.id)).toEqual([theirs]);
    expect(customers[0]).toMatchObject({
      apiKeys: 1,
      internal: false,
      members: 1,
    });
    const everyone = await api.operator.organizations({
      includeInternal: true,
      search: suffix,
    });
    expect(everyone.map((row) => row.id).sort()).toEqual([ours, theirs]);
    expect(everyone.find((row) => row.id === ours)?.internal).toBe(true);

    const before = await api.operator.overview({});
    const withOurs = await api.operator.overview({ includeInternal: true });
    expect(withOurs.organizations).toBeGreaterThan(before.organizations);
    expect(withOurs.people).toBeGreaterThan(before.people);
    expect(before.activeApiKeys).toBeGreaterThanOrEqual(1);

    const detail = await api.operator.organization({ id: theirs });
    expect(detail.members.map((member) => member.email)).toEqual([
      customer.email,
    ]);
    expect(detail.apiKeys).toHaveLength(1);
    expect(JSON.stringify(detail)).not.toContain('usk-live-');
    expect(
      await api.operator.organization({ id: 'org_missing' }).then(
        () => null,
        (error: { code?: string }) => error.code,
      ),
    ).toBe('NOT_FOUND');
  });
});
