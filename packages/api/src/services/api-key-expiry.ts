import { ApiKeys } from '@seawatts/db/schema/api-keys';
import { tenantOf } from '@seawatts/db/tenant-lookup';
import { inTenant } from '@seawatts/db/transaction';
import { workerDb } from '@seawatts/db/worker-client';
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
  // A job, so the worker role. The run knows the key, not its organization:
  // find that first, then work inside it.
  const organizationId = await tenantOf('api_key_by_id', apiKeyId, workerDb);
  if (!organizationId) return { status: 'nothing_due' };
  return inTenant(
    organizationId,
    async (tx): Promise<ApiKeyExpiry> => {
      const [expired] = await tx
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
      const [key] = await tx
        .select({ expiresAt: ApiKeys.expiresAt, isActive: ApiKeys.isActive })
        .from(ApiKeys)
        .where(eq(ApiKeys.id, apiKeyId))
        .limit(1);
      if (!key?.isActive || !key.expiresAt) return { status: 'nothing_due' };
      return { status: 'waiting', until: key.expiresAt.toISOString() };
    },
    { client: workerDb },
  );
}

// A workflow run stays on the release that started it, so no run sleeps
// longer than this: it wakes, and if the key is still waiting it starts the
// next run on the latest release and ends.
export const longestSleepMs = 7 * 24 * 60 * 60 * 1000;

/**
 * When a run that was scheduled for `scheduledFor` wakes next, given the key
 * now expires at `until`. A different expiry means a newer save started its
 * own run: this one is replaced and stops, so one chain per key stays alive.
 */
export function nextExpiryWake(
  until: string,
  scheduledFor: string,
  now = Date.now(),
): { replaced: true } | { replaced: false; wakeAt: string } {
  const due = new Date(until).getTime();
  if (due !== new Date(scheduledFor).getTime()) return { replaced: true };
  return {
    replaced: false,
    wakeAt: new Date(Math.min(due, now + longestSleepMs)).toISOString(),
  };
}
