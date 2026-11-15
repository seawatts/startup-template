# Database roles and row-level security

The app never connects as the provider's admin role or with a service key. It connects as its own login roles, and the database, not only the code, keeps one organization's rows away from another's.

## The shape

- One schema, `startup_template`, owned by the migrator. Role names carry the schema's name (`startup_template_web`), because roles are shared by every database on a server.
- Three runtime login roles, one per job, each with its own connection URL. None is superuser, none can bypass row-level security, create roles or create databases.

| Role | Variable | Reaches | Used by |
|---|---|---|---|
| `…_web` | `POSTGRES_URL` | tenant tables, one organization per transaction | requests (`db`, `inTenant`) |
| `…_worker` | `POSTGRES_WORKER_URL` | the same tenant tables under the same rules, longer timeouts | workflow steps and crons (`workerDb`) |
| `…_auth` | `POSTGRES_AUTH_URL` | people, organizations, memberships, sessions, operators | the auth library and identity reads (`authDb`) |
| `…_migrator` | `POSTGRES_MIGRATOR_URL` | owns everything; may bypass row-level security | migrations, the seed script; never the running app |

- A table is exactly one kind, decided by its grants:
  - a tenant table (has `organizationId`): granted to web and worker, row-level security enabled and forced, one policy `"organizationId" = nullif(current_setting('app.tenant_id', true), '')` for reading and writing;
  - an auth table: granted to the auth role only, no row-level security (a person's memberships are read before an organization is chosen), so every query names its person or organization;
  - the migration ledger: no runtime role.
- `PUBLIC`, `anon`, `authenticated` and `service_role` get nothing. The app does not use Supabase's Data API; keep it off or with no schema exposed.

## In code

- Tenant rows are read and written inside `inTenant(organizationId, (tx) => …)` (`packages/db/src/transaction.ts`). It opens a transaction and sends `set_config('app.tenant_id', …, true)` with the first query, so the setting ends with the transaction and never reaches the next request on a pooled connection. Outside it a tenant query returns nothing and a write is refused. Keep the explicit `organizationId` filter too: the policy is the backstop, the filter is what the indexes serve.
- People, organizations, memberships and sessions go through `authDb` (`@seawatts/db/auth-client`); a job passes `{ client: workerDb }` to `inTenant`.
- A request that arrives before its organization is known (an API key, a short link, a sign-in code) asks `tenantOf(…)` (`tenant-lookup.ts`): a security-definer function that answers with the organization id and nothing else. Then it reads the row inside `inTenant`.
- Figures across organizations (the operator console) come from security-definer functions that return counts and dates only. Never grant a runtime role a way around the policy.
- A join between a tenant table and an auth table cannot run as any runtime role. Read each side with its role and combine in code, or add a narrow function.

## A new table

In the migration that creates it (migrations hold every grant, revoke and policy):

```sql
GRANT SELECT, INSERT, UPDATE, DELETE ON "startup_template"."notes" TO "startup_template_web", "startup_template_worker";
ALTER TABLE "startup_template"."notes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "startup_template"."notes" FORCE ROW LEVEL SECURITY;
CREATE POLICY tenant_access ON "startup_template"."notes"
  USING ("organizationId" = nullif(current_setting('app.tenant_id', true), ''))
  WITH CHECK ("organizationId" = nullif(current_setting('app.tenant_id', true), ''));
```

An auth table gets one line: `GRANT … TO "startup_template_auth"`. A new function: `REVOKE ALL … FROM PUBLIC`, then `GRANT EXECUTE` to the one role that calls it. The isolation test fails until the table is one of the three kinds.

## What is automatic and what is one-time

- Automatic, in every environment: everything in migrations (grants, revokes, forced row-level security, policies, functions), run as the migrator by `bun db:migrate`.
- One-time per database, needs the admin URL: creating the four roles with random passwords and handing the schema to the migrator. Migrations cannot do it: the migrator may not create roles, and passwords do not belong in migration files.
  - Hosted: `bun db:bootstrap` (`packages/db/scripts/bootstrap-roles.ts`), run by an operator. It stores each new URL in Infisical before it makes the role, never prints one, keeps a role that already exists exactly as it is, and refuses to run in CI or on the hosting platform. The full hosted setup is in [database-setup.md](database-setup.md).
  - Local and CI: `bun db:local` makes the same roles on a PostgreSQL on this machine (new passwords each run), migrates as the migrator, checks isolation and writes the URLs to `.env.database.local` (ignored by git). `. ./.env.database.local` before running the app or the tests, so both run as the real roles.
- Until a database has been bootstrapped, a role URL that is not set falls back to `POSTGRES_URL`. That keeps an old environment running; it is not isolation. `bun db:verify` fails on it.

## Prove it

- `bun db:verify`: the acceptance check for a new environment and after any role change. Each URL logs in as its role; a query without an organization returns nothing; inside one organization only its rows show; a cross-organization update changes nothing and a cross-organization insert is refused; the setting does not leak to the next query; web cannot read auth tables and auth cannot read tenant tables. It removes what it made.
- `packages/db/tests/unit/isolation.test.ts`: every migration applied to a database made for the test, then the rules read from the catalog (`isolation-check.ts`). It fails when a table is unclassified, a tenant table lacks forced row-level security or a policy, or `anon`, `authenticated` or `PUBLIC` can reach anything.
