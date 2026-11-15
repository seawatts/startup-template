'use server';

import { upsertOrg } from '@seawatts/api/services/upsert-org';
import { auth } from '@seawatts/auth/server';
import { authDb } from '@seawatts/db/auth-client';
import { OrgMembers, Orgs } from '@seawatts/db/schema/organizations';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { createSafeActionClient } from 'next-safe-action';
import { z } from 'zod';

// Create the action client
const action = createSafeActionClient();

// Helper function to get session
async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

export const upsertOrgAction = action
  .inputSchema(
    z.object({
      name: z.string().optional(),
      orgId: z.string().optional(),
      webhookId: z.string().optional(),
    }),
  )
  .action(async ({ parsedInput }) => {
    const { orgId, name, webhookId } = parsedInput;
    const session = await getSession();

    if (!session?.user?.id) {
      throw new Error('User not found');
    }

    const userId = session.user.id;

    console.log('upsertOrgAction called with:', {
      orgId,
      userId,
      webhookId,
    });

    // If no orgId is provided (creating new org), check if user already has an organization via membership
    if (!orgId) {
      // Find existing org through membership
      const existingOrg = await authDb
        .select({ id: Orgs.id, name: Orgs.name })
        .from(OrgMembers)
        .innerJoin(Orgs, eq(Orgs.id, OrgMembers.organizationId))
        .where(eq(OrgMembers.userId, userId))
        .limit(1)
        .then((rows) => rows[0]);
      console.log('Existing org found:', existingOrg);

      if (existingOrg) {
        // User already has an organization, use upsertOrg to get the proper return structure
        const result = await upsertOrg({
          name: existingOrg.name,
          orgId: existingOrg.id,
          userId,
        });

        console.log('Returning existing org result:', result);

        return {
          apiKey: result.apiKey,
          id: result.org.id,
          name: result.org.name,
          stripeCustomerId: result.org.stripeCustomerId,
        };
      }
    }

    console.log('Creating new organization...');

    // Use the upsertOrg utility function
    const result = await upsertOrg({
      name: name || 'Personal',
      orgId: orgId || '',
      userId,
    });

    console.log('New org result:', result);

    return {
      apiKey: result.apiKey,
      id: result.org.id,
      name: result.org.name,
      stripeCustomerId: result.org.stripeCustomerId,
    };
  });

export async function createOrgAction({
  name,
  webhookId,
}: {
  name: string;
  webhookId?: string;
}) {
  // You may want to get user info from session or context if needed
  return upsertOrgAction({ name, webhookId });
}
