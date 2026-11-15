import postgres from 'postgres';
import { databaseTls } from '../src/connection-config';
import { isolationProblems } from '../src/isolation-check';
import { type Job, roleName, urlVariable } from '../src/roles';

// The isolation acceptance check, for a new environment and after any role
// change (docs/agents/database-roles.md):
//
//   . ./.env.database.local && bun db:verify          local
//   infisical run --env=prod -- bun db:verify         hosted
//
// It logs in with each role's URL, makes two organizations with one row
// each, and proves a role sees only what it should. It removes what it made
// and prints no connection details.

const failures: string[] = [];
const check = (name: string, passed: boolean) => {
  console.log(`${passed ? 'ok  ' : 'FAIL'} ${name}`);
  if (!passed) failures.push(name);
};

function connect(job: Job) {
  const url = process.env[urlVariable[job]];
  if (!url) throw new Error(`${urlVariable[job]} is not set`);
  return postgres(url, {
    max: 1,
    onnotice: () => undefined,
    prepare: false,
    ssl: databaseTls(url),
  });
}
type Sql = ReturnType<typeof connect>;

const web = connect('web');
const worker = connect('worker');
const auth = connect('auth');

for (const [job, sql] of [
  ['web', web],
  ['worker', worker],
  ['auth', auth],
] as const) {
  const [who] = await sql<{ name: string; strong: boolean }[]>`
    select current_user as name, (rolsuper or rolbypassrls) as strong
    from pg_roles where rolname = current_user`;
  check(
    `${urlVariable[job]} logs in as ${roleName(job)}, without superuser or BYPASSRLS`,
    who?.name === roleName(job) && who.strong === false,
  );
}

const denied = (run: () => Promise<unknown>) =>
  run().then(
    () => false,
    (error: { code?: string }) => error.code === '42501',
  );
// One organization's transaction, the way `inTenant` opens it.
const inTenant = <T>(sql: Sql, id: string, run: (tx: Sql) => Promise<T>) =>
  sql.begin(async (tx) => {
    await tx`select set_config('app.tenant_id', ${id}, true)`;
    return run(tx as unknown as Sql);
  }) as Promise<T>;

const mark = `verify_${Date.now().toString(36)}`;
const user = `${mark}_user`;
const [first, second] = [`${mark}_a`, `${mark}_b`];
try {
  await auth`insert into startup_template."user" (id, email, name)
    values (${user}, ${`${mark}@example.com`}, 'Isolation check')`;
  for (const id of [first, second])
    await auth`insert into startup_template."organization" (id, name)
      values (${id}, ${id})`;
  for (const id of [first, second])
    await inTenant(
      web,
      id,
      (tx) => tx`insert into startup_template."shortUrls"
        (id, code, "organizationId", "redirectUrl", "userId")
        values (${id}, ${id}, ${id}, 'https://example.com', ${user})`,
    );

  const unscoped = await web`select id from startup_template."shortUrls"`;
  check(
    'web: a query without an organization returns no rows',
    unscoped.length === 0,
  );

  const scoped = await inTenant(
    web,
    first,
    (tx) => tx`select id from startup_template."shortUrls"`,
  );
  check(
    'web: inside one organization only its rows are visible',
    scoped.length === 1 && scoped[0]?.id === first,
  );

  const crossed = await inTenant(
    web,
    first,
    (tx) => tx`update startup_template."shortUrls" set "isActive" = false
      where "organizationId" = ${second} returning id`,
  );
  check(
    "web: an update aimed at another organization's row changes nothing",
    crossed.length === 0,
  );

  check(
    'web: a row cannot be written into another organization',
    await denied(() =>
      inTenant(
        web,
        first,
        (tx) => tx`insert into startup_template."shortUrls"
          (id, code, "organizationId", "redirectUrl", "userId")
          values (${`${mark}_x`}, ${`${mark}_x`}, ${second}, 'https://example.com', ${user})`,
      ),
    ),
  );

  const [after] = await web<{ tenant: string | null }[]>`
    select nullif(current_setting('app.tenant_id', true), '') as tenant`;
  check(
    'web: the organization setting does not reach the next query on the connection',
    after?.tenant === null,
  );

  const workerScoped = await inTenant(
    worker,
    second,
    (tx) => tx`select id from startup_template."shortUrls"`,
  );
  const workerUnscoped =
    await worker`select id from startup_template."shortUrls"`;
  check(
    'worker: the same rules as web',
    workerScoped.length === 1 &&
      workerScoped[0]?.id === second &&
      workerUnscoped.length === 0,
  );

  check(
    'web cannot read people, organizations or sessions',
    (await denied(() => web`select id from startup_template."user" limit 1`)) &&
      (await denied(
        () => web`select id from startup_template."organization" limit 1`,
      )) &&
      (await denied(
        () => web`select id from startup_template."session" limit 1`,
      )),
  );
  check(
    'auth cannot read tenant tables',
    (await denied(
      () => auth`select id from startup_template."shortUrls" limit 1`,
    )) &&
      (await denied(
        () => auth`select id from startup_template."apiKeys" limit 1`,
      )),
  );
  check(
    'no runtime role can read the migration ledger',
    (await denied(
      () => web`select 1 from startup_template."__drizzle_migrations" limit 1`,
    )) &&
      (await denied(
        () =>
          auth`select 1 from startup_template."__drizzle_migrations" limit 1`,
      )),
  );

  const [lookup] = await web<{ tenant: string | null }[]>`
    select startup_template.short_url_tenant(${first}) as tenant`;
  check(
    'web: the lookup before an organization is known answers with its id only',
    lookup?.tenant === first,
  );
  check(
    'auth cannot call the tenant lookups',
    await denied(
      () => auth`select startup_template.short_url_tenant(${first})`,
    ),
  );

  const problems = await isolationProblems(web);
  for (const problem of problems) console.log(`     ${problem}`);
  check(
    'every table is classified, forced where it must be, and closed to anon, authenticated and PUBLIC',
    problems.length === 0,
  );
} finally {
  // Deleting the organizations and the person removes their rows with them.
  await auth`delete from startup_template."organization" where id in (${first}, ${second})`;
  await auth`delete from startup_template."user" where id = ${user}`;
  await Promise.all([web.end(), worker.end(), auth.end()]);
}

if (failures.length > 0) {
  console.error(`${failures.length} isolation check(s) failed.`);
  process.exit(1);
}
console.log('Isolation holds.');
