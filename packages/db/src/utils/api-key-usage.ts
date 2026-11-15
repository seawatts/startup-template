import { eq } from 'drizzle-orm';
import { ApiKeys, ApiKeyUsage } from '../schema/api-keys';
import { inTenant } from '../transaction';

export type ApiKeyUsageType = 'mcp-server';

export interface ApiKeyUsageMetadata {
  [key: string]: unknown;
}

export async function trackApiKeyUsage({
  apiKey,
  type,
  metadata,
  userId,
  organizationId,
}: {
  apiKey: string;
  type: ApiKeyUsageType;
  metadata: ApiKeyUsageMetadata;
  userId: string;
  organizationId: string;
}) {
  try {
    // The caller names the organization; row-level security holds it to
    // that organization's keys.
    return await inTenant(organizationId, async (db) => {
      const apiKeyRecord = await db
        .select()
        .from(ApiKeys)
        .where(eq(ApiKeys.key, apiKey))
        .limit(1)
        .then((rows) => rows[0]);

      if (apiKeyRecord?.isActive) {
        // Create usage record
        await db.insert(ApiKeyUsage).values({
          apiKeyId: apiKeyRecord.id,
          metadata,
          organizationId,
          type,
          userId,
        });

        // Update last used timestamp on API key
        const [updatedApiKey] = await db
          .update(ApiKeys)
          .set({ lastUsedAt: new Date() })
          .where(eq(ApiKeys.id, apiKeyRecord.id))
          .returning();

        if (updatedApiKey) {
          return updatedApiKey;
        }
      }

      return apiKeyRecord;
    });
  } catch (error) {
    // Log error but don't fail the main operation
    console.error('Failed to track API key usage:', error);
  }
}
