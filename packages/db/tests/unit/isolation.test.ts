import { afterAll, beforeAll, describe, expect, test } from 'bun:test';
import postgres from 'postgres';
import { isolationProblems } from '../../src/isolation-check';
import { migrateDatabase } from '../../src/migrate';
import { ensureRoles, roleName } from '../../src/roles';

// Every migration applied to a database made for this test, then the rules
// in docs/agents/database-roles.md read back from the catalog. A migration
// that adds a table without its grants, forced row-level security and a
// policy fails here.
//
// Needs a PostgreSQL admin URL that may create databases and roles:
// TEST_POSTGRES_ADMIN_URL (`bun db:local` writes it to .env.database.local).
const adminUrl = process.env.TEST_POSTGRES_ADMIN_URL;

describe.skipIf(!adminUrl)('a fresh database', () => {
  const name = `isolation_${Date.now().toString(36)}`;
  const url = new URL(adminUrl ?? 'postgres://localhost/unused');
  url.pathname = `/${name}`;
  const server = postgres(adminUrl ?? '', { max: 1 });
  const admin = postgres(url.toString(), {
    max: 1,
    onnotice: () => undefined,
  });
  const table = (name: string) => admin`startup_template.${admin(name)}`;

  beforeAll(async () => {
    await server.unsafe(`create database "${name}"`);
    // Supabase's API roles, so the check has something to refuse.
    for (const role of ['anon', 'authenticated'])
      await server.unsafe(
        `do $$ begin create role ${role} nologin; exception when duplicate_object then null; end $$`,
      );
    // Existing roles keep their passwords: other tests are logged in as them.
    await ensureRoles(admin);
    await migrateDatabase(url.toString(), roleName('migrator'));
  });
  afterAll(async () => {
    await admin.end();
    await server.unsafe(`drop database if exists "${name}" with (force)`);
    await server.end();
  });

  test('every table is classified, tenant tables force row-level security, and the API roles get nothing', async () => {
    expect(await isolationProblems(admin)).toEqual([]);
  });

  test('a query without an organization sees no tenant rows; inside one it sees only that one', async () => {
    await admin`insert into ${table('user')} (id, email, name)
      values ('user_1', 'one@example.com', 'One')`;
    for (const id of ['org_a', 'org_b']) {
      await admin`insert into ${table('organization')} (id, name) values (${id}, ${id})`;
      await admin`insert into ${table('shortUrls')} (id, code, "organizationId", "redirectUrl", "userId")
        values (${id}, ${id}, ${id}, 'https://example.com', 'user_1')`;
    }
    const as = (role: string, tenant: string | null) =>
      admin.begin(async (tx) => {
        await tx.unsafe(`set local role ${role}`);
        if (tenant)
          await tx`select set_config('app.tenant_id', ${tenant}, true)`;
        return tx<
          { id: string }[]
        >`select id from ${tx('startup_template.shortUrls')}`;
      });
    for (const role of [roleName('web'), roleName('worker')]) {
      expect(await as(role, null)).toEqual([]);
      expect((await as(role, 'org_a')).map((row) => row.id)).toEqual(['org_a']);
    }
    // The migrator owns the table and is still held to nothing: it is the
    // one role that passes, and only it.
    expect(await as(roleName('migrator'), null)).toHaveLength(2);
    // The error code a role gets for reading a table, or 'allowed'.
    const reading = async (role: string, target: string) => {
      try {
        await admin.begin(async (tx) => {
          await tx.unsafe(`set local role ${role}`);
          await tx`select 1 from ${tx(`startup_template.${target}`)} limit 1`;
        });
        return 'allowed';
      } catch (error) {
        return (error as { code?: string }).code;
      }
    };
    expect(await reading('anon', 'user')).toBe('42501');
    expect(await reading('authenticated', 'apiKeys')).toBe('42501');
    expect(await reading(roleName('auth'), 'apiKeys')).toBe('42501');
    expect(await reading(roleName('web'), 'user')).toBe('42501');
    expect(await reading(roleName('auth'), 'user')).toBe('allowed');
  });

  test('the check fails for a table a migration forgot', async () => {
    const problems = async (change: string, undo: string) => {
      await admin.unsafe(change);
      try {
        return (await isolationProblems(admin)).join('\n');
      } finally {
        await admin.unsafe(undo);
      }
    };
    expect(
      await problems(
        'create table startup_template.notes (id text primary key, "organizationId" text not null)',
        'drop table startup_template.notes',
      ),
    ).toContain('notes: no runtime role was granted it');
    expect(
      await problems(
        `create table startup_template.notes (id text primary key, "organizationId" text not null);
         grant select on startup_template.notes to ${roleName('web')}`,
        'drop table startup_template.notes',
      ),
    ).toContain('notes: a tenant table without forced row-level security');
    expect(
      await problems(
        'alter table startup_template."apiKeys" no force row level security',
        'alter table startup_template."apiKeys" force row level security',
      ),
    ).toContain('apiKeys: a tenant table without forced row-level security');
    expect(
      await problems(
        'drop policy tenant_access on startup_template."shortUrls"',
        `create policy tenant_access on startup_template."shortUrls" using ("organizationId" = nullif(current_setting('app.tenant_id', true), '')) with check ("organizationId" = nullif(current_setting('app.tenant_id', true), ''))`,
      ),
    ).toContain('shortUrls: a tenant table without a policy');
    expect(
      await problems(
        'grant select on startup_template."user" to anon',
        'revoke select on startup_template."user" from anon',
      ),
    ).toContain('user: anon was granted access');
    expect(
      await problems(
        'grant select on startup_template."session" to public',
        'revoke select on startup_template."session" from public',
      ),
    ).toContain('session: PUBLIC was granted access');
  });
});
