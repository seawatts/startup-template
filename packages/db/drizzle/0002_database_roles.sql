-- Roles and row-level security (docs/agents/database-roles.md).
-- The login roles are made once per database by the bootstrap script
-- (hosted) or the local database runner, never here: a migration has no
-- right to create roles and no business holding passwords.
DO $$ BEGIN
	IF (SELECT count(*) FROM pg_roles WHERE rolname IN ('startup_template_web', 'startup_template_worker', 'startup_template_auth')) < 3 THEN
		RAISE EXCEPTION 'The database roles are missing. Run "bun db:bootstrap" (hosted) or "bun db:local" (local) once, then migrate as the migrator role.';
	END IF;
END $$;
--> statement-breakpoint
REVOKE ALL ON SCHEMA "startup_template" FROM PUBLIC;
--> statement-breakpoint
REVOKE ALL ON ALL TABLES IN SCHEMA "startup_template" FROM PUBLIC;
--> statement-breakpoint
-- Supabase's API roles get nothing: the app never uses the Data API.
DO $$ DECLARE api_role text; BEGIN
	FOREACH api_role IN ARRAY ARRAY['anon', 'authenticated', 'service_role'] LOOP
		IF EXISTS (SELECT 1 FROM pg_roles WHERE rolname = api_role) THEN
			EXECUTE format('REVOKE ALL ON SCHEMA "startup_template" FROM %I', api_role);
			EXECUTE format('REVOKE ALL ON ALL TABLES IN SCHEMA "startup_template" FROM %I', api_role);
			EXECUTE format('REVOKE ALL ON ALL SEQUENCES IN SCHEMA "startup_template" FROM %I', api_role);
			EXECUTE format('REVOKE ALL ON ALL FUNCTIONS IN SCHEMA "startup_template" FROM %I', api_role);
		END IF;
	END LOOP;
END $$;
--> statement-breakpoint
-- Policies an earlier setup script made for the "authenticated" API role.
DO $$ DECLARE old record; BEGIN
	FOR old IN SELECT policyname, tablename FROM pg_policies WHERE schemaname = 'startup_template' LOOP
		EXECUTE format('DROP POLICY %I ON "startup_template".%I', old.policyname, old.tablename);
	END LOOP;
END $$;
--> statement-breakpoint
GRANT USAGE ON SCHEMA "startup_template" TO "startup_template_web", "startup_template_worker", "startup_template_auth";
--> statement-breakpoint
-- People, organizations, memberships, sessions and the operator list: the
-- auth role only. Not tenant-scoped (a person's memberships are read before
-- an organization is chosen), so no row-level security; no other runtime
-- role can reach them.
DO $$ DECLARE auth_table text; BEGIN
	FOREACH auth_table IN ARRAY ARRAY['user', 'account', 'session', 'verification', 'organization', 'member', 'invitation', 'operators'] LOOP
		EXECUTE format('ALTER TABLE "startup_template".%I DISABLE ROW LEVEL SECURITY', auth_table);
		EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON "startup_template".%I TO "startup_template_auth"', auth_table);
	END LOOP;
END $$;
--> statement-breakpoint
-- Tenant tables: the web and worker roles, one organization at a time. With
-- row-level security forced and one policy on a per-transaction setting, a
-- query that names no organization sees nothing and writes nothing.
DO $$ DECLARE tenant_table text; BEGIN
	FOREACH tenant_table IN ARRAY ARRAY['apiKeys', 'apiKeyUsage', 'authCodes', 'shortUrls'] LOOP
		EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON "startup_template".%I TO "startup_template_web", "startup_template_worker"', tenant_table);
		EXECUTE format('ALTER TABLE "startup_template".%I ENABLE ROW LEVEL SECURITY', tenant_table);
		EXECUTE format('ALTER TABLE "startup_template".%I FORCE ROW LEVEL SECURITY', tenant_table);
		EXECUTE format('CREATE POLICY tenant_access ON "startup_template".%I USING ("organizationId" = nullif(current_setting(''app.tenant_id'', true), '''')) WITH CHECK ("organizationId" = nullif(current_setting(''app.tenant_id'', true), ''''))', tenant_table);
	END LOOP;
END $$;
--> statement-breakpoint
-- Lookups that happen before the organization is known answer with the
-- organization id and nothing else; the caller then reads the row inside
-- that organization's transaction. They run as their owner (the migrator),
-- which is the only role allowed past row-level security.
CREATE FUNCTION "startup_template".api_key_tenant(api_key text) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
	SELECT "organizationId" FROM "startup_template"."apiKeys" WHERE "key" = api_key LIMIT 1;
$$;
--> statement-breakpoint
CREATE FUNCTION "startup_template".api_key_tenant_by_id(api_key_id text) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
	SELECT "organizationId" FROM "startup_template"."apiKeys" WHERE "id" = api_key_id LIMIT 1;
$$;
--> statement-breakpoint
CREATE FUNCTION "startup_template".short_url_tenant(short_code text) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
	SELECT "organizationId" FROM "startup_template"."shortUrls" WHERE "code" = short_code LIMIT 1;
$$;
--> statement-breakpoint
CREATE FUNCTION "startup_template".auth_code_tenant(auth_code_id text) RETURNS text
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
	SELECT "organizationId" FROM "startup_template"."authCodes" WHERE "id" = auth_code_id LIMIT 1;
$$;
--> statement-breakpoint
-- The operator console's figures across organizations: counts and dates,
-- never a key's value or any other content.
CREATE FUNCTION "startup_template".operator_api_usage(organization_ids text[])
RETURNS TABLE(organization_id text, api_keys integer, last_api_use timestamp with time zone)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
	SELECT "organizationId"::text, count(*)::integer, max("lastUsedAt")
	FROM "startup_template"."apiKeys"
	WHERE "organizationId" = ANY (organization_ids)
	GROUP BY "organizationId";
$$;
--> statement-breakpoint
CREATE FUNCTION "startup_template".operator_api_totals(excluded_organization_ids text[], since timestamp with time zone)
RETURNS TABLE(active_api_keys integer, api_calls integer)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = pg_catalog AS $$
	SELECT
		(SELECT count(*) FROM "startup_template"."apiKeys"
			WHERE "isActive" AND NOT ("organizationId" = ANY (excluded_organization_ids)))::integer,
		(SELECT count(*) FROM "startup_template"."apiKeyUsage"
			WHERE "createdAt" >= since AND NOT ("organizationId" = ANY (excluded_organization_ids)))::integer;
$$;
--> statement-breakpoint
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA "startup_template" FROM PUBLIC;
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "startup_template".api_key_tenant(text), "startup_template".api_key_tenant_by_id(text), "startup_template".short_url_tenant(text), "startup_template".auth_code_tenant(text) TO "startup_template_web", "startup_template_worker";
--> statement-breakpoint
GRANT EXECUTE ON FUNCTION "startup_template".operator_api_usage(text[]), "startup_template".operator_api_totals(text[], timestamp with time zone) TO "startup_template_web";
