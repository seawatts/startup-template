import { createHmac, randomBytes } from 'node:crypto';
import { type BrowserContext, test as base } from '@playwright/test';
import postgres from 'postgres';

// A signed-in person for a browser test, made directly in the database: a
// user, an organization they own and a session, with the session cookie
// signed the way the auth library signs it. No sign-in form, no email, so a
// test starts on the screen it is about. Each test gets its own person and
// organization and removes them afterwards.
//
// Needs the same database and auth secret as the running app:
// POSTGRES_URL, POSTGRES_AUTH_URL and BETTER_AUTH_SECRET. The person, the
// organization and the session are written as the auth role; the
// organization's first API key is a tenant row, written as the web role
// inside that organization (docs/agents/database-roles.md).

type Person = {
  email: string;
  organizationId: string;
  userId: string;
  /** The signed session cookie's value. */
  cookie: string;
};

function required(name: string) {
  const value = process.env[name];
  if (!value) throw new Error(`${name} must be set to run the browser tests`);
  return value;
}

const signed = (token: string, secret: string) =>
  encodeURIComponent(
    `${token}.${createHmac('sha256', secret).update(token).digest('base64')}`,
  );

export const test = base.extend<{
  /** A new person who owns a new organization. */
  person: Person;
  /** Signs a browser context in as that person. */
  signIn: (context: BrowserContext) => Promise<void>;
}>({
  // The test's own page starts signed in.
  context: async ({ context, signIn }, use) => {
    await signIn(context);
    await use(context);
  },
  // biome-ignore lint/correctness/noEmptyPattern: Playwright reads the fixture names from this pattern
  person: async ({}, use) => {
    const web = postgres(required('POSTGRES_URL'), { max: 1, prepare: false });
    const sql = postgres(
      process.env.POSTGRES_AUTH_URL || required('POSTGRES_URL'),
      {
        max: 1,
        prepare: false,
      },
    );
    const id = randomBytes(8).toString('hex');
    const token = randomBytes(24).toString('hex');
    const person: Person = {
      cookie: signed(token, required('BETTER_AUTH_SECRET')),
      email: `e2e-${id}@example.com`,
      organizationId: `org_e2e_${id}`,
      userId: `user_e2e_${id}`,
    };
    const table = (name: string) => sql`startup_template.${sql(name)}`;
    await sql`insert into ${table('user')} (id, email, "emailVerified", name)
      values (${person.userId}, ${person.email}, true, 'E2E Person')`;
    await sql`insert into ${table('organization')} (id, name)
      values (${person.organizationId}, ${`E2E ${id}`})`;
    await sql`insert into ${table('member')} (id, "organizationId", "userId", role)
      values (${`member_e2e_${id}`}, ${person.organizationId}, ${person.userId}, 'owner')`;
    await sql`insert into ${table('session')} (id, token, "userId", "expiresAt", "activeOrganizationId")
      values (${`session_e2e_${id}`}, ${token}, ${person.userId}, now() + interval '1 hour', ${person.organizationId})`;
    // Every new organization starts with one API key, as sign-up gives it.
    await web.begin(async (tx) => {
      await tx`select set_config('app.tenant_id', ${person.organizationId}, true)`;
      await tx`insert into startup_template."apiKeys" (id, key, name, "organizationId", "userId")
        values (${`ak_e2e_${id}`}, ${`usk-live-e2e-${token}`}, 'First key', ${person.organizationId}, ${person.userId})`;
    });
    await use(person);
    await sql`delete from ${table('organization')} where id = ${person.organizationId}`;
    await sql`delete from ${table('user')} where id = ${person.userId}`;
    await Promise.all([sql.end(), web.end()]);
  },
  signIn: async ({ baseURL, person }, use) => {
    await use(async (context) => {
      await context.addCookies([
        {
          name: 'better-auth.session_token',
          url: baseURL ?? 'http://localhost:3000',
          value: person.cookie,
        },
      ]);
    });
  },
});
