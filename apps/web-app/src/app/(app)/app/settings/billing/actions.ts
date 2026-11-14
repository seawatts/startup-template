'use server';

import { auth } from '@seawatts/auth/server';
import { db } from '@seawatts/db/client';
import { Orgs } from '@seawatts/db/schema/organizations';
import {
  BILLING_INTERVALS,
  createBillingPortalSession,
  createCheckoutSession,
  getOrCreateCustomer,
  PLAN_TYPES,
  stripe,
} from '@seawatts/stripe';
import { eq } from 'drizzle-orm';
import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
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

// Create checkout session action
export const createCheckoutSessionAction = action.action(async () => {
  const session = await getSession();

  if (!session?.user?.id || !session.session?.activeOrganizationId) {
    throw new Error('Unauthorized');
  }

  const userId = session.user.id;
  const orgId = session.session.activeOrganizationId;

  // Get the organization
  const org = await db
    .select()
    .from(Orgs)
    .where(eq(Orgs.id, orgId))
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
        userId,
      },
      name: org.name,
    });

    if (!customer) {
      throw new Error('Failed to create Stripe customer');
    }

    customerId = customer.id;

    // Update org with customer ID
    await db
      .update(Orgs)
      .set({
        stripeCustomerId: customerId,
      })
      .where(eq(Orgs.id, orgId));
  }

  // Create checkout session
  const checkoutSession = await createCheckoutSession({
    billingInterval: BILLING_INTERVALS.MONTHLY,
    cancelUrl: `${origin}/app/settings/billing?canceled=true`,
    customerId,
    orgId,
    planType: PLAN_TYPES.TEAM,
    successUrl: `${origin}/app/settings/billing?success=true`,
  });

  // Redirect to Stripe Checkout
  if (!checkoutSession.url) {
    throw new Error('Failed to create checkout session');
  }
  redirect(checkoutSession.url);
});

// Create billing portal session action
export const createBillingPortalSessionAction = action.action(async () => {
  const session = await getSession();

  if (!session?.user?.id || !session.session?.activeOrganizationId) {
    throw new Error('Unauthorized');
  }

  const orgId = session.session.activeOrganizationId;

  // Get the organization
  const org = await db
    .select()
    .from(Orgs)
    .where(eq(Orgs.id, orgId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!org || !org.stripeCustomerId) {
    throw new Error('No active subscription found');
  }

  // Get the origin URL
  const headersList = await headers();
  const origin = headersList.get('origin') || 'https://seawatts.sh';

  // Create billing portal session
  const portalSession = await createBillingPortalSession({
    customerId: org.stripeCustomerId,
    returnUrl: `${origin}/app/settings/billing`,
  });

  // Redirect to Stripe Billing Portal
  redirect(portalSession.url);
});

// Get invoices action
export const getInvoicesAction = action.action(async () => {
  const session = await getSession();

  if (!session?.user?.id || !session.session?.activeOrganizationId) {
    throw new Error('Unauthorized');
  }

  const orgId = session.session.activeOrganizationId;

  // Get the organization
  const org = await db
    .select()
    .from(Orgs)
    .where(eq(Orgs.id, orgId))
    .limit(1)
    .then((rows) => rows[0]);

  if (!org || !org.stripeCustomerId) {
    throw new Error('No active subscription found');
  }

  // Get invoices from Stripe
  const invoices = await stripe.invoices.list({
    customer: org.stripeCustomerId,
    limit: 20, // Limit to recent invoices
  });

  return invoices.data.map((invoice) => ({
    amount: invoice.total || 0,
    created: invoice.created,
    currency: invoice.currency,
    hostedInvoiceUrl: invoice.hosted_invoice_url,
    id: invoice.id,
    invoicePdf: invoice.invoice_pdf,
    status: invoice.status,
  }));
});
