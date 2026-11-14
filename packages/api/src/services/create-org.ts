import { db } from '@seawatts/db/client';
import { ApiKeys } from '@seawatts/db/schema/api-keys';
import { OrgMembers, Orgs } from '@seawatts/db/schema/organizations';
import { Users } from '@seawatts/db/schema/users';
import { generateRandomName } from '@seawatts/id';
import {
  BILLING_INTERVALS,
  createSubscription,
  getFreePlanPriceId,
  PLAN_TYPES,
  upsertStripeCustomer,
} from '@seawatts/stripe';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';

type Transaction = Parameters<Parameters<typeof db.transaction>[0]>[0];

type CreateOrgParams = {
  name: string;
  userId: string;
};

type CreateOrgResult = {
  org: {
    id: string;
    name: string;
    stripeCustomerId: string;
  };
  apiKey: {
    id: string;
    key: string;
    name: string;
  };
};

// Helper function to create default API key
async function ensureDefaultApiKey({
  organizationId,
  userId,
  tx,
}: {
  organizationId: string;
  userId: string;
  tx: Transaction;
}) {
  const existingApiKey = await tx
    .select()
    .from(ApiKeys)
    .where(eq(ApiKeys.organizationId, organizationId))
    .limit(1)
    .then((rows) => rows[0]);

  if (existingApiKey) {
    return existingApiKey;
  }

  const [apiKey] = await tx
    .insert(ApiKeys)
    .values({
      name: 'Default',
      organizationId,
      userId,
    })
    .onConflictDoUpdate({
      set: {
        updatedAt: new Date(),
      },
      target: ApiKeys.key,
    })
    .returning();

  if (!apiKey) {
    throw new Error(
      `Failed to create API key for organizationId: ${organizationId}, userId: ${userId}`,
    );
  }

  return apiKey;
}

// Helper function to create org in database
async function createOrgInDatabase({
  orgId,
  name,
  userId,
  tx,
}: {
  orgId: string;
  name: string;
  userId: string;
  tx: Transaction;
}) {
  const [org] = await tx
    .insert(Orgs)
    .values({
      id: orgId,
      name,
      slug: generateRandomName(),
    })
    .returning();

  if (!org) {
    throw new Error(
      `Failed to create organization for orgId: ${orgId}, name: ${name}, userId: ${userId}`,
    );
  }

  // Create org membership with owner role
  await tx.insert(OrgMembers).values({
    organizationId: org.id,
    role: 'owner',
    userId,
  });

  return org;
}

// Helper function to update org with Stripe customer ID
async function updateOrgWithStripeCustomerId({
  orgId,
  stripeCustomerId,
  tx,
}: {
  orgId: string;
  stripeCustomerId: string;
  tx: Transaction;
}) {
  await tx
    .update(Orgs)
    .set({
      stripeCustomerId,
      updatedAt: new Date(),
    })
    .where(eq(Orgs.id, orgId));
}

// Helper function to auto-subscribe to free plan
async function autoSubscribeToFreePlan({
  customerId,
  orgId,
  tx,
}: {
  customerId: string;
  orgId: string;
  tx: Transaction;
}) {
  try {
    // Get the free plan price ID
    const freePriceId = await getFreePlanPriceId();
    if (!freePriceId) {
      console.error(
        `Failed to get free plan price ID for orgId: ${orgId}, customerId: ${customerId}`,
      );
      return null;
    }

    // Create subscription to free plan
    const subscription = await createSubscription({
      billingInterval: BILLING_INTERVALS.MONTHLY,
      customerId,
      orgId,
      planType: PLAN_TYPES.FREE,
      priceId: freePriceId,
    });

    if (!subscription) {
      console.error(
        `Failed to create subscription for orgId: ${orgId}, customerId: ${customerId}, priceId: ${freePriceId}`,
      );
      return null;
    }

    // Update org with subscription info
    await tx
      .update(Orgs)
      .set({
        stripeCustomerId: customerId,
        stripeSubscriptionId: subscription.id,
        stripeSubscriptionStatus: subscription.status,
        updatedAt: new Date(),
      })
      .where(eq(Orgs.id, orgId));

    console.log(
      `Auto-subscribed org ${orgId} to free plan with subscription ${subscription.id}`,
    );
    return subscription;
  } catch (error) {
    if (error instanceof Error) {
      console.error(
        `Failed to auto-subscribe to free plan for orgId: ${orgId}, customerId: ${customerId}. Original error: ${error.message}`,
      );
    } else {
      console.error(
        `Failed to auto-subscribe to free plan for orgId: ${orgId}, customerId: ${customerId}`,
      );
    }
    // Don't throw error - org creation should still succeed
    return null;
  }
}

/**
 * Creates a new organization with Stripe integration and API key
 * This function is specifically designed for onboarding new users
 */
export async function createOrg({
  name,
  userId,
}: CreateOrgParams): Promise<CreateOrgResult> {
  return await db.transaction(async (tx) => {
    // Get user from database
    const existingUser = await tx
      .select()
      .from(Users)
      .where(eq(Users.id, userId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!existingUser) {
      throw new Error(`User not found for userId: ${userId}`);
    }

    const userEmail = existingUser.email;

    // Check if organization name already exists in database
    const existingOrgByName = await tx
      .select()
      .from(Orgs)
      .where(eq(Orgs.name, name))
      .limit(1)
      .then((rows) => rows[0]);

    if (existingOrgByName) {
      throw new Error(
        `Organization name "${name}" is already taken. Please choose a different name.`,
      );
    }

    // Generate unique org ID
    const orgId = generateRandomName();

    // Final check: Double-check that the organization wasn't created by another process
    const finalCheckOrg = await tx
      .select()
      .from(Orgs)
      .where(eq(Orgs.id, orgId))
      .limit(1)
      .then((rows) => rows[0]);

    if (finalCheckOrg) {
      console.log(
        'Organization was created by another process, using existing org:',
        finalCheckOrg.id,
      );

      // Get or create API key for existing org
      const apiKey = await ensureDefaultApiKey({
        organizationId: finalCheckOrg.id,
        tx,
        userId,
      });

      return {
        apiKey: {
          id: apiKey.id,
          key: apiKey.key,
          name: apiKey.name,
        },
        org: {
          id: finalCheckOrg.id,
          name: finalCheckOrg.name,
          stripeCustomerId: finalCheckOrg.stripeCustomerId || '',
        },
      };
    }

    // Create org in database
    const org = await createOrgInDatabase({
      name,
      orgId,
      tx,
      userId,
    });

    // Create or update Stripe customer
    console.log(
      'Creating/updating Stripe customer for org:',
      org.id,
      'name:',
      name,
    );

    let stripeCustomer: Stripe.Customer;
    try {
      stripeCustomer = await upsertStripeCustomer({
        additionalMetadata: {
          orgName: name,
          userId,
        },
        email: userEmail,
        name,
        orgId: org.id,
      });
      if (!stripeCustomer) {
        throw new Error(
          `Failed to create or get Stripe customer for orgId: ${org.id}, name: ${name}, email: ${userEmail}`,
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to create or get Stripe customer for orgId: ${org.id}, name: ${name}, email: ${userEmail}. Original error: ${error.message}`,
        );
      }
      throw new Error(
        `Failed to create or get Stripe customer for orgId: ${org.id}, name: ${name}, email: ${userEmail}`,
      );
    }

    console.log(
      'Stripe customer created/updated:',
      stripeCustomer.id,
      'for org:',
      org.id,
    );

    // Update org in database with Stripe customer ID
    await updateOrgWithStripeCustomerId({
      orgId: org.id,
      stripeCustomerId: stripeCustomer.id,
      tx,
    });

    // Auto-subscribe to free plan
    await autoSubscribeToFreePlan({
      customerId: stripeCustomer.id,
      orgId: org.id,
      tx,
    });

    // Create default API key
    const apiKey = await ensureDefaultApiKey({
      organizationId: org.id,
      tx,
      userId,
    });

    return {
      apiKey: {
        id: apiKey.id,
        key: apiKey.key,
        name: apiKey.name,
      },
      org: {
        id: org.id,
        name: org.name,
        stripeCustomerId: stripeCustomer.id,
      },
    };
  });
}
