import { posthog } from '@acme/analytics/posthog/server';
import { db } from '@acme/db/client';
import { Users } from '@acme/db/schema';
import type { UserJSON, WebhookEvent } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

export async function handleUserUpdated(event: WebhookEvent) {
  // Narrow event.data to UserJSON for 'user.updated' events
  const userData = event.data as UserJSON;
  const email = userData.email_addresses.find(
    (email: { id: string; email_address: string }) =>
      email.id === userData.primary_email_address_id,
  )?.email_address;

  const [user] = await db
    .update(Users)
    .set({
      avatarUrl: userData.image_url,
      email,
      firstName: userData.first_name,
      lastName: userData.last_name,
    })
    .where(eq(Users.clerkId, userData.id))
    .returning({
      email: Users.email,
      id: Users.id,
    });

  if (!user) {
    return new Response('User not found on user.update', { status: 400 });
  }

  posthog.capture({
    distinctId: user.id,
    event: 'update_user',
    properties: {
      email: user.email,
    },
  });

  return undefined;
}
