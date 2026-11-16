import type { Session } from '@seawatts/auth/server';
import { readSession } from '@seawatts/auth/session-reader';
import { authDb } from '@seawatts/db/auth-client';
import { headers } from 'next/headers';

// The route handler passes the request's headers; a job or test that calls
// in process leaves them out and Next's own headers are read.
export const createORPCContext = async (requestHeaders?: Headers) => {
  const callerHeaders = requestHeaders ?? (await headers());
  let session: Session | null = null;
  try {
    // The session-only reader: a cold server answers a read without
    // loading the sign-in providers (packages/auth session-reader.ts).
    session = await readSession(callerHeaders);
  } catch {
    console.error('Authentication lookup failed');
  }
  const userId = session?.user?.id ?? null;
  const orgId = session?.session?.activeOrganizationId ?? null;
  return {
    // Set when the caller is an API key (api-key-context.ts), never for a
    // signed-in session.
    apiKey: null as { id: string } | null,
    auth: { orgId, userId },
    // People, organizations and memberships (the auth role). Tenant tables
    // are read inside `inTenant(organizationId, …)`, never through here.
    authDb,
    // The caller's headers, for the few writes that go through Better
    // Auth's own API (members, invitations), which reads the session cookie
    // itself. Empty for an API key.
    headers: callerHeaders,
    organizationId: orgId,
    session,
    user: session?.user ?? null,
  };
};

export type Context = Awaited<ReturnType<typeof createORPCContext>>;
