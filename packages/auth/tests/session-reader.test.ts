import { afterAll, describe, expect, it } from 'bun:test';

// Needs a real PostgreSQL with the schema migrated: set TEST_POSTGRES_URL to
// a disposable database (`bun db:migrate` against it first).
const url = process.env.TEST_POSTGRES_URL;

// The session-only reader (session-reader.ts) answers API requests and the
// route proxy in place of the full Better Auth instance. It is only safe
// while it returns exactly what the full instance returns for the same
// cookie; a plugin or session setting added to one and not the other shows
// up here.
describe.skipIf(!url)('readSession', () => {
  process.env.POSTGRES_URL = url;
  process.env.BETTER_AUTH_SECRET ??= 'test-only-secret-test-only-secret-0000';
  process.env.GOOGLE_CLIENT_ID ??= 'test';
  process.env.GOOGLE_CLIENT_SECRET ??= 'test';
  const loaded = Promise.all([
    import('../src/server'),
    import('../src/session-reader'),
    import('better-auth/crypto'),
    import('@seawatts/db/client'),
  ]);

  afterAll(async () => {
    const [, , , { connection }] = await loaded;
    await connection.end();
  });

  const signedIn = async () => {
    const [{ auth }, , { makeSignature }] = await loaded;
    const ctx = await auth.$context;
    const user = await ctx.internalAdapter.createUser({
      email: `reader-${crypto.randomUUID()}@example.com`,
      emailVerified: true,
      name: 'Reader Test',
    });
    const session = await ctx.internalAdapter.createSession(user.id);
    const signature = await makeSignature(session.token, ctx.secret);
    const cookie = `${ctx.authCookies.sessionToken.name}=${encodeURIComponent(
      `${session.token}.${signature}`,
    )}`;
    return { cookie, ctx, session, user };
  };

  it('returns the same session as the full instance', async () => {
    const [{ auth }, { readSession }] = await loaded;
    const { cookie, ctx, user } = await signedIn();
    const headers = new Headers({ cookie });
    const full = await auth.api.getSession({ headers });
    const read = await readSession(headers);
    expect(full?.user.id).toBe(user.id);
    expect(read).toEqual(full as typeof read);
    // The fields plugins add are there, not only the built-in ones.
    expect(read?.session).toHaveProperty('activeOrganizationId');
    await ctx.internalAdapter.deleteUser(user.id);
  });

  it('returns nothing for a missing, forged or signed-out cookie', async () => {
    const [, { readSession }] = await loaded;
    const { cookie, ctx, session, user } = await signedIn();
    expect(await readSession(new Headers())).toBeNull();
    expect(
      await readSession(new Headers({ cookie: `${cookie.slice(0, -4)}AAAA` })),
    ).toBeNull();
    await ctx.internalAdapter.deleteSession(session.token);
    expect(await readSession(new Headers({ cookie }))).toBeNull();
    await ctx.internalAdapter.deleteUser(user.id);
  });
});
