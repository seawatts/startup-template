import { ApiKeys, ApiKeyUsage, AuthCodes } from '@seawatts/db/schema/api-keys';
import { OrgMembers, Orgs } from '@seawatts/db/schema/organizations';
import { Users } from '@seawatts/db/schema/users';
import { sql } from 'drizzle-orm';
import type { PostgresJsDatabase } from 'drizzle-orm/postgres-js';

export async function cleanupTestData(db: PostgresJsDatabase): Promise<void> {
  // Delete all data in reverse order of dependencies
  // Use try-catch to handle potential constraint issues
  try {
    await db.delete(AuthCodes);
    await db.delete(ApiKeyUsage);
    await db.delete(ApiKeys);
    await db.delete(OrgMembers);
    await db.delete(Orgs);
    await db.delete(Users);
  } catch (error) {
    console.warn('Cleanup warning:', error);
    // If there are constraint issues, try again in a different order
    try {
      // Use TRUNCATE CASCADE for more thorough cleanup
      await db.execute(
        sql`TRUNCATE TABLE "authCodes", "apiKeyUsage", "apiKeys", "orgMembers", "orgs", "user" RESTART IDENTITY CASCADE`,
      );
    } catch (truncateError) {
      console.error('Failed to cleanup test data:', truncateError);
      throw truncateError;
    }
  }
}
