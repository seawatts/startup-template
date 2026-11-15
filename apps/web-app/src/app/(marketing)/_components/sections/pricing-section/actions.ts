'use server';

import { auth } from '@seawatts/auth/server';
import { authDb } from '@seawatts/db/auth-client';
import { Orgs } from '@seawatts/db/schema/organizations';
import {
  BILLING_INTERVALS,
  createCheckoutSession,
  getOrCreateCustomer,
  PLAN_TYPES,
} from '@seawatts/stripe';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createSafeActionClient } from 'next-safe-action';
import { z } from 'zod';

// Create the action client
const action = createSafeActionClient();

// Validation schemas
const createCheckoutSchema = z.object({
  billingInterval: z.enum(['monthly', 'yearly']).default('monthly'),
  orgId: z.string().min(1, 'Organization ID is required'),
  planType: z.enum(['free', 'team']).default('team'),
});

// Helper function to get session
async function getSession() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  return session;
}

// Create checkout session action for pricing cards
export const createCheckoutSessionAction = action
  .inputSchema(createCheckoutSchema)
  .action(async ({ parsedInput }) => {
    const session = await getSession();

    if (!session?.user?.id) {
      throw new Error('Unauthorized');
    }

    // Get the organization
    const org = await authDb
      .select()
      .from(Orgs)
      .where(eq(Orgs.id, parsedInput.orgId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!org) {
      throw new Error('Organization not found');
    }

    // Get the origin URL
    const headersList = await headers();
    const origin = headersList.get('origin') || 'https://seawatts.sh';

    // Create or get Stripe customer
    let customerId = org.stripeCustomerId;

    if (!customerId) {
      const customer = await getOrCreateCustomer({
        email: session.user.email || '',
        metadata: {
          orgId: org.id,
          userId: session.user.id,
        },
        name: org.name,
      });

      if (!customer) {
        throw new Error('Failed to create Stripe customer');
      }

      customerId = customer.id;

      // Update org with customer ID
      await authDb
        .update(Orgs)
        .set({
          stripeCustomerId: customerId,
        })
        .where(eq(Orgs.id, parsedInput.orgId));
    }

    // Create checkout session
    const checkoutSession = await createCheckoutSession({
      billingInterval:
        parsedInput.billingInterval === 'yearly'
          ? BILLING_INTERVALS.YEARLY
          : BILLING_INTERVALS.MONTHLY,
      cancelUrl: `${origin}/pricing?canceled=true`,
      customerId,
      orgId: parsedInput.orgId,
      planType:
        parsedInput.planType === 'free' ? PLAN_TYPES.FREE : PLAN_TYPES.TEAM,
      successUrl: `${origin}/app/settings/billing?success=true`,
    });

    // Redirect to Stripe Checkout
    if (!checkoutSession.url) {
      throw new Error('Failed to create checkout session');
    }
    redirect(checkoutSession.url);
  });
