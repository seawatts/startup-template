import type { OrganizationJSON, WebhookEvent } from '@clerk/nextjs/server';
import { posthog } from '@seawatts/analytics/posthog/server';
import { db } from '@seawatts/db/client';
import { Orgs, Users } from '@seawatts/db/schema';
import { eq } from 'drizzle-orm';

export async function handleOrganizationCreated(event: WebhookEvent) {
  // Narrow event.data to OrganizationJSON for 'organization.created' events
  const orgData = event.data as OrganizationJSON;

  if (!orgData.created_by) {
    console.log('No created_by field in organization creation event', orgData);
    return new Response('', { status: 200 });
  }

  // Find the user who created the organization
  const createdByUser = await db.query.Users.findFirst({
    where: eq(Users.clerkId, orgData.created_by),
  });

  if (!createdByUser) {
    console.log('User not found for organization creation', orgData.created_by);
    return new Response('', { status: 200 });
  }

  const [org] = await db
    .insert(Orgs)
    .values({
      clerkOrgId: orgData.id,
      createdByUserId: createdByUser.id,
      id: orgData.id,
      name: orgData.name,
    })
    .onConflictDoUpdate({
      set: {
        createdByUserId: createdByUser.id,
        name: orgData.name,
      },
      target: Orgs.clerkOrgId,
    })
    .returning();

  if (!org) {
    return new Response('Failed to create organization', { status: 400 });
  }

  posthog.capture({
    distinctId: org.id,
    event: 'create_organization',
    properties: {
      name: orgData.name,
    },
  });

  return undefined;
}
