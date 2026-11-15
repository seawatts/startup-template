import type postgres from 'postgres';
import { roleName, runtimeJobs, schemaName } from './roles';

type Sql = ReturnType<typeof postgres>;

// What must be true of the schema after every migration, read from the
// catalog. Any role can run it; it needs no login as the roles it checks.
//
// Every table is one of three kinds, decided by who was granted it:
// - a tenant table: the web or worker role can reach it, so it must force
//   row-level security and have a policy;
// - an auth table: only the auth role can reach it;
// - the migration ledger: no runtime role can reach it.
// A table no runtime role was granted (other than the ledger) is a table a
// migration forgot, and fails too.
const ledger = '__drizzle_migrations';
// Supabase's API roles, and PUBLIC, which every role is a member of.
const outsiders = ['anon', 'authenticated', 'service_role'];

export async function isolationProblems(sql: Sql): Promise<string[]> {
  const problems: string[] = [];
  const [web, worker, auth] = runtimeJobs.map(roleName) as [
    string,
    string,
    string,
  ];

  const roles = await sql<
    { rolname: string; rolsuper: boolean; rolbypassrls: boolean }[]
  >`select rolname, rolsuper, rolbypassrls from pg_roles
    where rolname = any(${[web, worker, auth]})`;
  for (const name of [web, worker, auth]) {
    const role = roles.find((row) => row.rolname === name);
    if (!role) problems.push(`role ${name} does not exist`);
    else if (role.rolsuper || role.rolbypassrls)
      problems.push(`role ${name} can bypass row-level security`);
  }
  if (problems.length > 0) return problems;

  const tables = await sql<
    {
      name: string;
      enabled: boolean;
      forced: boolean;
      policies: number;
      tenant_column: boolean;
      web: boolean;
      worker: boolean;
      auth: boolean;
    }[]
  >`select c.relname as name, c.relrowsecurity as enabled,
      c.relforcerowsecurity as forced,
      (select count(*) from pg_policy p where p.polrelid = c.oid)::int as policies,
      exists (select 1 from pg_attribute a where a.attrelid = c.oid
        and a.attname = 'organizationId' and not a.attisdropped) as tenant_column,
      has_table_privilege(${web}, c.oid, 'select, insert, update, delete') as web,
      has_table_privilege(${worker}, c.oid, 'select, insert, update, delete') as worker,
      has_table_privilege(${auth}, c.oid, 'select, insert, update, delete') as auth
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = ${schemaName} and c.relkind in ('r', 'p')
    order by c.relname`;
  for (const table of tables) {
    const reachable = table.web || table.worker;
    if (table.name === ledger) {
      if (reachable || table.auth)
        problems.push(`${table.name}: a runtime role can reach the ledger`);
      continue;
    }
    if (reachable && table.auth)
      problems.push(
        `${table.name}: granted to both the auth role and a tenant role`,
      );
    if (!reachable && !table.auth)
      problems.push(
        `${table.name}: no runtime role was granted it; add its grants and policy in the migration that creates it`,
      );
    if (reachable) {
      if (!table.enabled || !table.forced)
        problems.push(
          `${table.name}: a tenant table without forced row-level security`,
        );
      if (table.policies === 0)
        problems.push(`${table.name}: a tenant table without a policy`);
      if (!table.tenant_column)
        problems.push(
          `${table.name}: reachable by a tenant role but has no organizationId`,
        );
    }
  }

  const open = await sql<{ name: string; who: string }[]>`
    select c.relname as name, r.rolname as who
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    join pg_roles r on r.rolname = any(${outsiders})
    where n.nspname = ${schemaName} and c.relkind in ('r', 'p', 'v', 'm')
      and has_table_privilege(r.oid, c.oid, 'select, insert, update, delete')
    union all
    -- PUBLIC: a grant every role inherits, the API roles included.
    select c.relname, 'PUBLIC'
    from pg_class c join pg_namespace n on n.oid = c.relnamespace,
      aclexplode(c.relacl) grant_
    where n.nspname = ${schemaName} and grant_.grantee = 0`;
  for (const row of open)
    problems.push(`${row.name}: ${row.who} was granted access`);

  const schemaOpen = await sql<{ who: string }[]>`
    select r.rolname as who from pg_roles r
    where r.rolname = any(${outsiders})
      and has_schema_privilege(r.oid, ${schemaName}, 'usage')
    union all
    select 'PUBLIC' from pg_namespace n, aclexplode(n.nspacl) grant_
    where n.nspname = ${schemaName} and grant_.grantee = 0`;
  for (const row of schemaOpen)
    problems.push(`schema ${schemaName}: ${row.who} may use it`);

  const functions = await sql<{ name: string }[]>`
    select p.proname as name from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace,
      aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) grant_
    where n.nspname = ${schemaName} and grant_.grantee = 0`;
  for (const row of functions)
    problems.push(`function ${row.name}: PUBLIC may execute it`);

  return problems;
}
