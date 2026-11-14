import { db } from '@seawatts/db/client';
import { ApiKeys } from '@seawatts/db/schema/api-keys';
import { and, eq, lte } from 'drizzle-orm';

export type ApiKeyExpiry =
  | { status: 'expired'; organizationId: string }
  /** Not due yet: the key expires at `until` (ISO). */
  | { status: 'waiting'; until: string }
  /** Deleted, already off, or no longer expires. */
  | { status: 'nothing_due' };

/**
 * Switches a key off once its expiry has passed. Reads the key as it is now,
 * not as it was when the work was scheduled, and is safe to run any number
 * of times: the update only matches a key that is still on and due.
 */
export async function expireApiKeyIfDue(
  apiKeyId: string,
  now = new Date(),
): Promise<ApiKeyExpiry> {
  const [expired] = await db
    .update(ApiKeys)
    .set({ isActive: false })
    .where(
      and(
        eq(ApiKeys.id, apiKeyId),
        eq(ApiKeys.isActive, true),
        lte(ApiKeys.expiresAt, now),
      ),
    )
    .returning({ organizationId: ApiKeys.organizationId });
  if (expired)
    return { organizationId: expired.organizationId, status: 'expired' };
  const [key] = await db
    .select({ expiresAt: ApiKeys.expiresAt, isActive: ApiKeys.isActive })
    .from(ApiKeys)
    .where(eq(ApiKeys.id, apiKeyId))
    .limit(1);
  if (!key?.isActive || !key.expiresAt) return { status: 'nothing_due' };
  return { status: 'waiting', until: key.expiresAt.toISOString() };
}
