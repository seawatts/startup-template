import { authDb } from '@seawatts/db/auth-client';
import { notReading } from '@seawatts/db/read-only';
import { ApiKeys } from '@seawatts/db/schema/api-keys';
import { tenantOf } from '@seawatts/db/tenant-lookup';
import { inTenant } from '@seawatts/db/transaction';
import { and, eq, gt, isNull, or } from 'drizzle-orm';
import type { Context } from './context';

// Who an API key acts as: the person who created it, inside the key's
// organization. Nothing the caller sends can choose either.
export type ApiKeyPrincipal = {
  apiKeyId: string;
  orgId: string;
  userId: string;
};

export function bearerToken(headers: Headers) {
  const [scheme, token] = (headers.get('authorization') ?? '').split(' ');
  return scheme?.toLowerCase() === 'bearer' && token ? token : null;
}

// An active, unexpired key, or null. Two indexed reads: which organization
// the key belongs to (the key is unique), then the key inside it.
export async function readApiKey(
  headers: Headers,
): Promise<ApiKeyPrincipal | null> {
  const token = bearerToken(headers);
  if (!token) return null;
  const organizationId = await tenantOf('api_key', token);
  if (!organizationId) return null;
  const [key] = await inTenant(organizationId, (tx) =>
    tx
      .select({
        apiKeyId: ApiKeys.id,
        orgId: ApiKeys.organizationId,
        userId: ApiKeys.userId,
      })
      .from(ApiKeys)
      .where(
        and(
          eq(ApiKeys.key, token),
          eq(ApiKeys.isActive, true),
          or(isNull(ApiKeys.expiresAt), gt(ApiKeys.expiresAt, new Date())),
        ),
      )
      .limit(1),
  );
  return key ?? null;
}

// The same context shape a signed-in request gets, so a procedure behaves
// the same whichever way it is reached.
export const apiKeyContext = (principal: ApiKeyPrincipal): Context => ({
  apiKey: { id: principal.apiKeyId },
  auth: { orgId: principal.orgId, userId: principal.userId },
  authDb,
  headers: new Headers(),
  organizationId: principal.orgId,
  session: null,
  user: null,
});

// After the response: when the key was last used. Never awaited by a call.
// A record of the request itself, so it is allowed beside a read.
export async function recordApiKeyUse(principal: ApiKeyPrincipal) {
  await notReading(() =>
    inTenant(principal.orgId, (tx) =>
      tx
        .update(ApiKeys)
        .set({ lastUsedAt: new Date() })
        .where(eq(ApiKeys.id, principal.apiKeyId)),
    ),
  );
}
