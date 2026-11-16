import { afterAll, describe, expect, test } from 'bun:test';

// The example area through the in-process caller, against a real database
// with row-level security: TEST_POSTGRES_URL (bun db:local).
const url = process.env.TEST_POSTGRES_URL;

describe.skipIf(!url)('links, with a database', () => {
  process.env.POSTGRES_URL = url;
  process.env.CI ??= 'true';
  const loaded = Promise.all([
    import('@seawatts/db/auth-client').then(({ authDb }) => authDb),
    import('@seawatts/db/schema/organizations'),
    import('@seawatts/db/schema/users'),
    import('../src/caller'),
  ]);
  const suffix = Date.now().toString(36);
  const ours = { id: `org_links_ours_${suffix}`, name: `links-ours-${suffix}` };
  const theirs = {
    id: `org_links_theirs_${suffix}`,
    name: `links-theirs-${suffix}`,
  };
  const me = {
    email: `links-me-${suffix}@example.com`,
    id: `user_links_me_${suffix}`,
    name: 'Me',
  };
  const them = {
    email: `links-them-${suffix}@example.com`,
    id: `user_links_them_${suffix}`,
    name: 'Them',
  };
  const seeded = loaded.then(async ([db, { OrgMembers, Orgs }, { Users }]) => {
    await db.insert(Users).values([me, them]);
    await db.insert(Orgs).values([ours, theirs]);
    await db.insert(OrgMembers).values([
      { organizationId: ours.id, role: 'owner', userId: me.id },
      { organizationId: theirs.id, role: 'owner', userId: them.id },
    ]);
  });
  afterAll(async () => {
    const [db, { Orgs }, { Users }] = await loaded;
    const { inArray } = await import('drizzle-orm');
    await db.delete(Orgs).where(inArray(Orgs.id, [ours.id, theirs.id]));
    await db.delete(Users).where(inArray(Users.id, [me.id, them.id]));
  });

  const as = async (user: { id: string }, orgId: string) => {
    const [db, , , { createCaller }] = await loaded;
    return createCaller({
      apiKey: null,
      auth: { orgId, userId: user.id },
      authDb: db,
      headers: new Headers(),
      organizationId: orgId,
      session: null,
      user: null,
    } as never);
  };
  const codeOf = async (call: Promise<unknown>) =>
    call.then(
      () => 'allowed',
      (error: { code?: string }) => error.code,
    );

  test('create, list, turn off and delete a link', async () => {
    await seeded;
    const api = await as(me, ours.id);
    const chosen = await api.links.create({
      code: `launch-${suffix}`,
      redirectUrl: 'https://example.com/launch',
    });
    expect(chosen).toMatchObject({ code: `launch-${suffix}`, isActive: true });
    const random = await api.links.create({
      redirectUrl: 'https://example.com/other',
    });
    expect(random.code).toMatch(/^[a-z0-9]{7}$/);

    const listed = await api.links.list({ limit: 50 });
    expect(listed.map((link) => link.id)).toEqual([random.id, chosen.id]);

    const off = await api.links.setActive({ active: false, id: chosen.id });
    expect(off.isActive).toBe(false);

    expect(await api.links.delete({ id: random.id })).toEqual({
      id: random.id,
    });
    expect((await api.links.list({ limit: 50 })).map((l) => l.id)).toEqual([
      chosen.id,
    ]);
  });

  test('a taken code is refused with a reason', async () => {
    await seeded;
    const api = await as(me, ours.id);
    await api.links.create({
      code: `taken-${suffix}`,
      redirectUrl: 'https://example.com',
    });
    expect(
      await codeOf(
        (await as(them, theirs.id)).links.create({
          code: `taken-${suffix}`,
          redirectUrl: 'https://example.com',
        }),
      ),
    ).toBe('CONFLICT');
  });

  test('another organization cannot see or change a link', async () => {
    await seeded;
    const link = await (await as(me, ours.id)).links.create({
      redirectUrl: 'https://example.com/private',
    });
    const other = await as(them, theirs.id);
    expect(
      (await other.links.list({ limit: 100 })).map((row) => row.id),
    ).not.toContain(link.id);
    expect(await codeOf(other.links.get({ id: link.id }))).toBe('NOT_FOUND');
    expect(
      await codeOf(other.links.setActive({ active: false, id: link.id })),
    ).toBe('NOT_FOUND');
    expect(await codeOf(other.links.delete({ id: link.id }))).toBe('NOT_FOUND');
  });
});
