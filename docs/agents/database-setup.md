# Setting up a hosted database

Once per hosted database (each new project made from this template, each new environment). The pattern is in [database-roles.md](database-roles.md); this is the order of work and who can do each step. Open a "Database setup" issue (`.github/ISSUE_TEMPLATE/database-setup.md`) and work through it there.

## The steps

| # | Step | Who can do it |
|---|---|---|
| 1 | Put the database admin connection string in Infisical as `DATABASE_ADMIN_URL` | Browser: the provider's copy button to Infisical's secret field. Nothing else ever holds it |
| 2 | Run the role bootstrap: `infisical run --env=<env> -- bun db:bootstrap --env <env>` | A Claude session, once step 1 is done. Try `--dry-run` first |
| 3 | Enable the extensions the app needs with the admin role (none in the template as shipped) | A Claude session, with the Supabase connector or the admin URL |
| 4 | Run the migrations as the migrator: `infisical run --env=<env> -- bun db:migrate` | A Claude session |
| 5 | Turn off the provider's public Data API, or expose no schema (Supabase: Project Settings, Data API) | Browser |
| 6 | Add the database's CA certificate as `DATABASE_CA_CERT` (Supabase: Database settings, SSL, download certificate) | Browser. The certificate is public, the variable still lives in Infisical |
| 7 | Copy the role URLs and the CA from Infisical to the hosting platform's variables, then redeploy | Browser, or a session with the hosting connector |
| 8 | Verify: `infisical run --env=<env> -- bun db:verify`, then `bun check:deploy <url>` | A Claude session |

Steps 2 and 4 change a hosted database, and step 7 changes what production connects as: each waits for the owner's typed go. A session never runs them against a hosted database on a relayed or remembered approval.

## Before step 2 on a database that already has data

- The bootstrap gives the existing schema and its tables to the migrator. On a database shared with other apps it touches only this app's schema and the four `startup_template_*` roles; say so in the issue before running it.
- If the schema was made with `bun db:push`, there is no migration ledger and `bun db:migrate` would try to create tables that exist. Check first (`--dry-run` reports the roles; `select count(*) from startup_template.__drizzle_migrations` reports the ledger) and stop if it is missing.
- The app keeps working between steps: until the hosting platform has the role URLs (step 7) it connects as it did before.

## Rules for a session doing the browser steps

- Use the owner's signed-in browser. Stop at any login, 2FA or passkey prompt and hand over.
- A secret goes from the provider's copy button straight into Infisical and nowhere else: not chat, not a file, not a terminal, not the issue.
- Change nothing that is not a step here.
- Report back on the issue with what was done and what was verified, without any value.

## If something goes wrong

- The bootstrap stores passwords before it creates roles, so a failed run leaves either nothing or roles whose URLs are in Infisical; run it again.
- A role's URL was lost: as the admin, `alter role … password '…'` with a new random password and update the variable. The bootstrap never changes an existing role's password itself.
- Back out before step 7 by doing nothing: the app still connects as before. After step 7, put the old `POSTGRES_URL` back and remove the other role URLs; the admin role is not held by the policies.
