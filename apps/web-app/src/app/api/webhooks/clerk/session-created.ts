import { posthog } from '@acme/analytics/posthog/server';
import { db } from '@acme/db/client';
import { Users } from '@acme/db/schema';
import type { SessionJSON, WebhookEvent } from '@clerk/nextjs/server';
import { eq } from 'drizzle-orm';

export async function handleSessionCreated(event: WebhookEvent) {
  // Narrow event.data to SessionJSON for 'session.created' events
  const sessionData = event.data as SessionJSON;

  const existingUser = await db.query.Users.findFirst({
    where: eq(Users.clerkId, sessionData.user_id),
  });

  if (!existingUser) {
    console.log('User not found on session.created', sessionData.user_id);
    return new Response('', { status: 200 });
  }

  const [user] = await db
    .update(Users)
    .set({
      lastLoggedInAt: new Date(),
    })
    .where(eq(Users.clerkId, sessionData.user_id))
    .returning({
      email: Users.email,
      id: Users.id,
    });

  if (!user) {
    return new Response('User not found on session.created', { status: 400 });
  }

  posthog.capture({
    distinctId: user.id,
    event: 'login',
    properties: {
      email: user.email,
    },
  });

  return undefined;
}
