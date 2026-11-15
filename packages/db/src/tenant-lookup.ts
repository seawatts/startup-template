import { sql } from 'drizzle-orm';
import { db } from './client';

// A few requests arrive before their organization is known: an API key in a
// header, a short link, a sign-in code. Row-level security hides every
// tenant row from a query that names no organization, so these ask a
// database function that answers with the organization id and nothing else
// (migration 0002). The caller then reads the row itself inside
// `inTenant(id, …)`, where the usual rules apply.
type Lookup = 'api_key' | 'api_key_by_id' | 'short_url' | 'auth_code';

const functions: Record<Lookup, ReturnType<typeof sql.raw>> = {
  api_key: sql.raw('"startup_template".api_key_tenant'),
  api_key_by_id: sql.raw('"startup_template".api_key_tenant_by_id'),
  auth_code: sql.raw('"startup_template".auth_code_tenant'),
  short_url: sql.raw('"startup_template".short_url_tenant'),
};

/** The organization that owns the row with this value, or null. */
export async function tenantOf(
  lookup: Lookup,
  value: string,
  client: Pick<typeof db, 'execute'> = db,
): Promise<string | null> {
  const [row] = await client.execute<{ tenant: string | null }>(
    sql`select ${functions[lookup]}(${value}) as tenant`,
  );
  return row?.tenant ?? null;
}
