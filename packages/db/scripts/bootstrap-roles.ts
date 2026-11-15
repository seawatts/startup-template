import { rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import postgres from 'postgres';
import { databaseTls } from '../src/connection-config';
import {
  ensureRoles,
  type Job,
  missingRoles,
  newPassword,
  roleUrl,
  urlVariable,
} from '../src/roles';

// The one-time setup of a hosted database's roles
// (docs/agents/database-setup.md):
//
//   infisical run --env=prod -- bun db:bootstrap --env prod
//
// It connects with the admin URL (DATABASE_ADMIN_URL in Infisical), makes
// the roles that are missing with random passwords, hands the schema to the
// migrator and writes each new role's URL to Infisical. Nothing is printed
// but role names and what happened to them.
//
// Safe to run again: a role that exists is kept and its password is never
// changed, so its URL is not rewritten either. It refuses to run in CI or on
// the hosting platform: only an operator runs it, on purpose.

if (process.env.CI || process.env.VERCEL || process.env.GITHUB_ACTIONS)
  throw new Error(
    'The role bootstrap is run by an operator, never by CI or a deploy.',
  );

const args = process.argv.slice(2);
const environment = args[args.indexOf('--env') + 1];
if (!args.includes('--env') || !environment)
  throw new Error('Name the Infisical environment: --env prod');
const dryRun = args.includes('--dry-run');

const adminUrl = process.env.DATABASE_ADMIN_URL;
if (!adminUrl)
  throw new Error(
    'DATABASE_ADMIN_URL is not set. Put the database admin URL in Infisical under that name and run this through `infisical run`.',
  );

const admin = postgres(adminUrl, {
  max: 1,
  onnotice: () => undefined,
  prepare: false,
  ssl: databaseTls(adminUrl),
});
const [me] = await admin<{ can: boolean; who: string }[]>`
  select current_user as who, (rolcreaterole or rolsuper) as can
  from pg_roles where rolname = current_user`;
if (!me?.can) {
  await admin.end();
  throw new Error(
    `DATABASE_ADMIN_URL logs in as ${me?.who}, which may not create roles.`,
  );
}
if (dryRun) {
  const existing = await admin<{ rolname: string }[]>`
    select rolname from pg_roles where rolname like 'startup\_template\_%'`;
  const [ledger] = await admin<{ found: boolean }[]>`
    select to_regclass('startup_template.__drizzle_migrations') is not null as found`;
  const [tables] = await admin<{ count: number }[]>`
    select count(*)::int as count from pg_tables where schemaname = 'startup_template'`;
  console.log(
    [
      `Dry run as ${me.who}. Nothing changed.`,
      `Roles present: ${existing.map((row) => row.rolname).join(', ') || 'none'}.`,
      `Schema: ${tables?.count ?? 0} tables; migration ledger ${ledger?.found ? 'found' : 'missing'}.`,
      (tables?.count ?? 0) > 0 && !ledger?.found
        ? 'The schema was not made by migrations: stop, bun db:migrate would try to create tables that exist.'
        : '',
    ]
      .filter(Boolean)
      .join('\n'),
  );
  await admin.end();
  process.exit(0);
}

// New passwords are stored before the roles are made: if storing fails,
// nothing was created; if creating fails, the stored URLs are replaced by
// the next run. A password is never left known only to this process.
const missing = await missingRoles(admin);
const passwords = Object.fromEntries(
  missing.map((job) => [job, newPassword()]),
) as Partial<Record<Job, string>>;
// The pooled URL for the app's roles; migrations use a direct session, the
// same host on port 5432.
const secrets = missing.map((job) => {
  const url = roleUrl(adminUrl, job, passwords[job] ?? '');
  return `${urlVariable[job]}=${job === 'migrator' ? url.replace(':6543', ':5432') : url}`;
});

if (secrets.length > 0) {
  // Through a private file, never the command line: arguments are visible
  // to every process on the machine.
  const file = path.join(tmpdir(), `roles-${crypto.randomUUID()}.env`);
  await Bun.write(file, `${secrets.join('\n')}\n`, { mode: 0o600 });
  try {
    const set = Bun.spawn(
      ['infisical', 'secrets', 'set', `--env=${environment}`, `--file=${file}`],
      { stderr: 'pipe', stdout: 'ignore' },
    );
    if ((await set.exited) !== 0) {
      await admin.end();
      throw new Error(
        `Infisical did not store the new URLs, so no role was made: ${(await new Response(set.stderr).text()).slice(0, 300)}`,
      );
    }
  } finally {
    await rm(file, { force: true });
  }
}

const roles = await ensureRoles(admin, { passwords });
await admin.end();

for (const role of roles)
  console.log(
    role.password
      ? `${role.role}: ${role.state}; ${urlVariable[role.job]} written to Infisical (${environment})`
      : `${role.role}: kept as it is; its URL was not changed`,
  );
console.log(
  'Next: copy the new variables to the hosting platform, run the migrations as the migrator (bun db:migrate), then bun db:verify.',
);
