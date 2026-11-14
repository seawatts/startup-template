import { db } from '@seawatts/db/client';
import { notReading } from '@seawatts/db/read-only';
import { ApiKeys } from '@seawatts/db/schema/api-keys';
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

// An active, unexpired key, or null. One indexed read (the key is unique).
export async function readApiKey(
  headers: Headers,
): Promise<ApiKeyPrincipal | null> {
  const token = bearerToken(headers);
  if (!token) return null;
  const [key] = await db
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
    .limit(1);
  return key ?? null;
}

// The same context shape a signed-in request gets, so a procedure behaves
// the same whichever way it is reached.
export const apiKeyContext = (principal: ApiKeyPrincipal): Context => ({
  apiKey: { id: principal.apiKeyId },
  auth: { orgId: principal.orgId, userId: principal.userId },
  db,
  organizationId: principal.orgId,
  session: null,
  user: null,
});

// After the response: when the key was last used. Never awaited by a call.
// A record of the request itself, so it is allowed beside a read.
export async function recordApiKeyUse(principal: ApiKeyPrincipal) {
  await notReading(() =>
    db
      .update(ApiKeys)
      .set({ lastUsedAt: new Date() })
      .where(eq(ApiKeys.id, principal.apiKeyId)),
  );
}
