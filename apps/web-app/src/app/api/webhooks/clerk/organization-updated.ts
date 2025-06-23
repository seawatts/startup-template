import { posthog } from '@acme/analytics/posthog/server';
import { db } from '@acme/db/client';
import { Orgs } from '@acme/db/schema';
import type { OrganizationJSON, WebhookEvent } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

export async function handleOrganizationUpdated(event: WebhookEvent) {
  // Narrow event.data to OrganizationJSON for 'organization.updated' events
  const orgData = event.data as OrganizationJSON;

  const [org] = await db
    .update(Orgs)
    .set({
      name: orgData.name,
    })
    .where(eq(Orgs.clerkOrgId, orgData.id))
    .returning({
      id: Orgs.id,
      name: Orgs.name,
    });

  if (!org) {
    return new Response('Organization not found on organization.updated', {
      status: 400,
    });
  }

  posthog.capture({
    distinctId: org.id,
    event: 'update_organization',
    properties: {
      name: org.name,
    },
  });

  return undefined;
}
