'use server';

import { auth } from '@seawatts/auth/server';
import { AuthCodes } from '@seawatts/db/schema/api-keys';
import { inTenant } from '@seawatts/db/transaction';
import { and, eq, gt, isNull } from 'drizzle-orm';
import { headers } from 'next/headers';
import { createSafeActionClient } from 'next-safe-action';

// Create the action client
const action = createSafeActionClient();

// Helper function to get session
async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export const createAuthCode = action.action(async () => {
  const session = await getSession();

  if (!session?.user?.id) {
    throw new Error('User not found');
  }

  if (!session.session?.activeOrganizationId) {
    throw new Error('Organization not found');
  }

  const userId = session.user.id;
  const orgId = session.session.activeOrganizationId;
  const sessionId = session.session.id;

  // First check for an existing unused and non-expired auth code
  const existingAuthCode = await inTenant(orgId, (tx) =>
    tx
      .select()
      .from(AuthCodes)
      .where(
        and(
          eq(AuthCodes.userId, userId),
          eq(AuthCodes.organizationId, orgId),
          isNull(AuthCodes.usedAt),
          gt(AuthCodes.expiresAt, new Date()),
        ),
      )
      .limit(1)
      .then((rows) => rows[0]),
  );

  if (existingAuthCode) {
    return {
      authCode: existingAuthCode,
      isNew: false,
    };
  }

  console.log('creating auth code', orgId, userId, sessionId);
  // If no valid auth code exists, create a new one
  const [authCode] = await inTenant(orgId, (tx) =>
    tx
      .insert(AuthCodes)
      .values({
        organizationId: orgId,
        sessionId,
        userId,
      })
      .returning(),
  );

  if (!authCode) {
    throw new Error('Failed to create auth code');
  }

  return {
    authCode,
    isNew: true,
  };
});
