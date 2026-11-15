import { chmod } from 'node:fs/promises';
import path from 'node:path';
import postgres from 'postgres';
import { isolationProblems } from '../src/isolation-check';
import { migrateDatabase } from '../src/migrate';
import { ensureRoles, type Job, roleUrl, urlVariable } from '../src/roles';

// Prepares a local or CI PostgreSQL the way a hosted one is prepared, so
// the app and its tests connect as the real roles:
//
//   bun db:local                         the local Supabase database
//   bun db:local --admin <url>           another server's admin URL
//   bun db:local --database <name>       a new database on that server
//
// It makes the roles (new random passwords each run), applies every
// migration as the migrator, checks the isolation rules and writes the
// connection URLs to .env.database.local (ignored by git). Load them with
// `. ./.env.database.local`. Never point it at a hosted database: it resets
// the roles' passwords. Hosted databases use `bun db:bootstrap`.

const args = process.argv.slice(2);
const option = (name: string) => {
  const at = args.indexOf(`--${name}`);
  return at === -1 ? undefined : args[at + 1];
};

const loopback = ['localhost', '127.0.0.1', '[::1]'];
const serverUrl =
  option('admin') ??
  process.env.DATABASE_ADMIN_URL ??
  'postgresql://postgres:postgres@127.0.0.1:14322/postgres';
if (!loopback.includes(new URL(serverUrl).hostname))
  throw new Error(
    'bun db:local only prepares a database on this machine. Use bun db:bootstrap for a hosted one.',
  );

const step = (text: string) => console.log(`- ${text}`);

let adminUrl = serverUrl;
const database = option('database');
if (database) {
  if (!/^[a-z_][a-z0-9_]*$/.test(database))
    throw new Error('A database name is lowercase letters, digits and _.');
  const server = postgres(serverUrl, { max: 1 });
  const [found] =
    await server`select 1 from pg_database where datname = ${database}`;
  if (!found) await server.unsafe(`create database "${database}"`);
  await server.end();
  const url = new URL(serverUrl);
  url.pathname = `/${database}`;
  adminUrl = url.toString();
  step(`${found ? 'found' : 'created'} database ${database} (admin URL)`);
}

const admin = postgres(adminUrl, { max: 1, onnotice: () => undefined });
const roles = await ensureRoles(admin, { resetPasswords: true });
for (const role of roles) step(`role ${role.role}: ${role.state} (admin URL)`);
step('schema owned by the migrator (admin URL)');

const urls = Object.fromEntries(
  roles.map((role) => [
    role.job,
    roleUrl(adminUrl, role.job, role.password ?? ''),
  ]),
) as Record<Job, string>;

await migrateDatabase(urls.migrator);
step('every migration applied (as the migrator, automatic)');

const problems = await isolationProblems(admin);
await admin.end();
if (problems.length > 0) {
  console.error(`Isolation check failed:\n${problems.join('\n')}`);
  process.exit(1);
}
step('isolation rules hold for every table (automatic)');

const file = path.join(import.meta.dir, '../../../.env.database.local');
const lines = [
  '# Written by `bun db:local`. Local passwords only; rewritten on each run.',
  ...Object.entries(urls).map(
    ([job, url]) => `export ${urlVariable[job as Job]}='${url}'`,
  ),
  `export TEST_POSTGRES_URL='${urls.web}'`,
  `export TEST_POSTGRES_ADMIN_URL='${adminUrl}'`,
  '',
];
await Bun.write(file, lines.join('\n'));
await chmod(file, 0o600);
step(`connection URLs written to ${path.relative(process.cwd(), file)}`);
