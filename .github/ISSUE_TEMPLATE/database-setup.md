---
name: Database setup (hosted, one time)
about: Roles, row-level security, Data API and CA for a new hosted database. A computer-use hand-off.
title: 'Set up the hosted database: roles, row-level security, Data API, CA'
labels: computer-use
---

## Goal

The hosted database for `<environment>` follows `docs/agents/database-roles.md`: the app connects as its own restricted roles, every tenant table forces row-level security, the public Data API is off and TLS is verified against the database's CA.

## Current state

<!-- Fill in before starting. No secret values. -->
- Provider and project:
- Is the database shared with other apps?
- Does `startup_template.__drizzle_migrations` exist (was the schema migrated or pushed)?
- What `POSTGRES_URL` logs in as today:

## Rules for the agent

- Use the owner's signed-in browser. Stop at any login, 2FA or passkey prompt and hand over.
- Secrets go from the provider's copy button straight into Infisical and nowhere else: not chat, not a file, not a terminal, not this issue.
- Change nothing that is not a step below.
- Steps marked **go** change a hosted database or what production connects as. Each waits for the owner's typed go on this issue.

## Steps

1. [ ] Browser: copy the database admin connection string from the provider into Infisical as `DATABASE_ADMIN_URL` (environment `<environment>`).
2. [ ] Session: `infisical run --env=<environment> -- bun db:bootstrap --env <environment> --dry-run`, and report the roles it found.
3. [ ] **go** Session: `infisical run --env=<environment> -- bun db:bootstrap --env <environment>`. It writes the four role URLs to Infisical and prints only role names.
4. [ ] Session: enable the extensions the app needs as the admin role (none in the template as shipped).
5. [ ] **go** Session: `infisical run --env=<environment> -- bun db:migrate` (runs as the migrator).
6. [ ] Browser: turn the provider's public Data API off, or leave no schema exposed (Supabase: Project Settings, Data API).
7. [ ] Browser: download the database's CA certificate and store it in Infisical as `DATABASE_CA_CERT` (Supabase: Database settings, SSL).
8. [ ] **go** Browser or hosting connector: copy `POSTGRES_URL`, `POSTGRES_AUTH_URL`, `POSTGRES_WORKER_URL` and `DATABASE_CA_CERT` from Infisical to the hosting platform's variables and redeploy. `POSTGRES_MIGRATOR_URL` and `DATABASE_ADMIN_URL` stay out of the hosting platform.

## Verification

- [ ] `infisical run --env=<environment> -- bun db:verify` ends with "Isolation holds."
- [ ] `bun check:deploy <production url>`: every kind of function answers, the database read included.
- [ ] The provider's API endpoint for the app's schema answers with an error, not data.

## Report back

Comment with: which steps were done and by whom, the output of the two verification commands (they print no secrets), and anything left open. No connection strings, passwords or keys.
