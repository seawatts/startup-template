import { randomBytes } from 'node:crypto';
import type postgres from 'postgres';

// The database roles (docs/agents/database-roles.md). One login role per
// job, none of them superuser or able to bypass row-level security, plus the
// migrator that owns the schema and runs migrations. Role names carry the
// schema's name because roles are shared by every database on a server.
export const schemaName = 'startup_template';

export const runtimeJobs = ['web', 'worker', 'auth'] as const;
export const jobs = [...runtimeJobs, 'migrator'] as const;
export type Job = (typeof jobs)[number];

export const roleName = (job: Job) => `${schemaName}_${job}`;

/** The variable that holds each role's connection URL. */
export const urlVariable: Record<Job, string> = {
  auth: 'POSTGRES_AUTH_URL',
  migrator: 'POSTGRES_MIGRATOR_URL',
  web: 'POSTGRES_URL',
  worker: 'POSTGRES_WORKER_URL',
};

// Defaults for statements outside `inTransaction`, which sets its own
// limit. A request must not hold a connection for minutes; a job may.
const roleSettings: Record<Job, Record<string, string>> = {
  auth: {
    idle_in_transaction_session_timeout: '60s',
    statement_timeout: '30s',
  },
  migrator: { idle_in_transaction_session_timeout: '10min' },
  web: {
    idle_in_transaction_session_timeout: '60s',
    statement_timeout: '30s',
  },
  worker: {
    idle_in_transaction_session_timeout: '5min',
    statement_timeout: '5min',
  },
};

const attributes = (job: Job) =>
  `LOGIN NOSUPERUSER NOCREATEDB NOCREATEROLE NOINHERIT NOREPLICATION ${
    job === 'migrator' ? 'BYPASSRLS' : 'NOBYPASSRLS'
  }`;

type Sql = ReturnType<typeof postgres>;

export type RoleResult = {
  job: Job;
  role: string;
  /** Set when this run made the role or gave it a new password. */
  password?: string;
  state: 'created' | 'kept' | 'password reset';
};

// Hex only, so it needs no escaping in SQL or in a URL.
export const newPassword = () => randomBytes(24).toString('hex');
const identifier = (name: string) => `"${name.replace(/"/g, '""')}"`;

/**
 * Creates the roles that are missing and hands the schema to the migrator.
 * Needs a role that may create roles (the provider's admin role), which is
 * why it is a one-time script and not a migration. Safe to run again: a role
 * that exists keeps its password unless `resetPasswords` is on, which only
 * the local runner uses (its passwords live in a local file it rewrites).
 */
export async function ensureRoles(
  admin: Sql,
  {
    passwords = {},
    resetPasswords = false,
  }: {
    /** Passwords chosen (and stored) before the roles are made. */
    passwords?: Partial<Record<Job, string>>;
    resetPasswords?: boolean;
  } = {},
): Promise<RoleResult[]> {
  const results: RoleResult[] = [];
  for (const job of jobs) {
    const role = roleName(job);
    const [existing] = await admin<
      { strong: boolean; bypass: boolean }[]
    >`select (rolsuper or rolcreaterole or rolcreatedb) as strong,
        rolbypassrls as bypass
      from pg_roles where rolname = ${role}`;
    if (!existing) {
      const password = passwords[job] ?? newPassword();
      await admin.unsafe(
        `create role ${identifier(role)} ${attributes(job)} password '${password}'`,
      );
      results.push({ job, password, role, state: 'created' });
    } else {
      // A role someone made by hand must not hold more rights than ours.
      // It is refused, not changed: taking rights away is the owner's call.
      if (existing.strong || (existing.bypass && job !== 'migrator'))
        throw new Error(
          `Role ${role} exists with more rights than it may have (superuser, create role, create database or bypass row-level security). Fix or drop it, then run again.`,
        );
      if (resetPasswords) {
        const password = newPassword();
        await admin.unsafe(
          `alter role ${identifier(role)} password '${password}'`,
        );
        results.push({ job, password, role, state: 'password reset' });
      } else results.push({ job, role, state: 'kept' });
    }
    for (const [name, value] of Object.entries(roleSettings[job]))
      await admin.unsafe(
        `alter role ${identifier(role)} set ${name} = '${value}'`,
      );
  }
  await giveSchemaToMigrator(admin);
  return results;
}

// The migrator owns the schema and everything in it, so migrations need no
// admin rights. On a database that already has the schema (made as the
// admin role) each object changes owner once.
async function giveSchemaToMigrator(admin: Sql) {
  const migrator = identifier(roleName('migrator'));
  const schema = identifier(schemaName);
  const [me] = await admin<{ superuser: boolean; version: number }[]>`
    select rolsuper as superuser, current_setting('server_version_num')::int as version
    from pg_roles where rolname = current_user`;
  // To give an object to a role, a role that is not a superuser must be a
  // member of it.
  if (!me?.superuser)
    await admin.unsafe(
      (me?.version ?? 0) >= 160000
        ? `grant ${migrator} to current_user with inherit true, set true`
        : `grant ${migrator} to current_user`,
    );
  const [database] = await admin<{ name: string }[]>`
    select current_database() as name`;
  // The migration tool runs `create schema if not exists`, which checks this
  // right even when the schema is there.
  await admin.unsafe(
    `grant connect, create on database ${identifier(database?.name ?? '')} to ${migrator}`,
  );
  const [found] = await admin<{ nspname: string }[]>`
    select nspname from pg_namespace where nspname = ${schemaName}`;
  if (!found) {
    await admin.unsafe(`create schema ${schema} authorization ${migrator}`);
    return;
  }
  await admin.unsafe(`alter schema ${schema} owner to ${migrator}`);
  const owned = await admin<{ statement: string }[]>`
    select format('alter %s %I.%I owner to %I',
      case c.relkind when 'S' then 'sequence' when 'v' then 'view'
        when 'm' then 'materialized view' else 'table' end,
      n.nspname, c.relname, ${roleName('migrator')}::text) as statement
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = ${schemaName} and c.relkind in ('r', 'p', 'S', 'v', 'm')
      and pg_get_userbyid(c.relowner) <> ${roleName('migrator')}
      -- A sequence that belongs to a column follows its table.
      and not exists (select 1 from pg_depend d
        where d.objid = c.oid and d.deptype in ('a', 'i') and c.relkind = 'S')
    union all
    select format('alter type %I.%I owner to %I', n.nspname, t.typname, ${roleName('migrator')}::text)
    from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = ${schemaName} and t.typtype in ('e', 'd')
      and pg_get_userbyid(t.typowner) <> ${roleName('migrator')}
    union all
    select format('alter routine %I.%I(%s) owner to %I', n.nspname, p.proname,
      pg_get_function_identity_arguments(p.oid), ${roleName('migrator')}::text)
    from pg_proc p join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = ${schemaName}
      and pg_get_userbyid(p.proowner) <> ${roleName('migrator')}`;
  for (const { statement } of owned) await admin.unsafe(statement);
}

/** The jobs whose roles do not exist yet. */
export async function missingRoles(admin: Sql): Promise<Job[]> {
  const found = await admin<{ rolname: string }[]>`
    select rolname from pg_roles where rolname = any(${jobs.map(roleName)})`;
  return jobs.filter(
    (job) => !found.some((row) => row.rolname === roleName(job)),
  );
}

/**
 * A role's URL made from another URL to the same database. A pooler that
 * names the project in the user (`postgres.abcd` on Supabase) keeps that
 * suffix.
 */
export function roleUrl(baseUrl: string, job: Job, password: string) {
  const url = new URL(baseUrl);
  const suffix = url.username.includes('.')
    ? url.username.slice(url.username.indexOf('.'))
    : '';
  url.username = `${roleName(job)}${suffix}`;
  url.password = password;
  return url.toString();
}
