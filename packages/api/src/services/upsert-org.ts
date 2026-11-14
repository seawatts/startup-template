import { db } from '@seawatts/db/client';
import { ApiKeys } from '@seawatts/db/schema/api-keys';
import { OrgMembers, Orgs } from '@seawatts/db/schema/organizations';
import { Users } from '@seawatts/db/schema/users';
import { generateRandomName, generateUniqueOrgName } from '@seawatts/id';
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

type UpsertOrgParams = {
  orgId?: string;
  name: string;
  userId: string;
};

type UpsertOrgResult = {
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

// Helper function to create or update org membership
async function ensureOrgMembership({
  organizationId,
  userId,
  tx,
}: {
  organizationId: string;
  userId: string;
  tx: Transaction;
}) {
  await tx
    .insert(OrgMembers)
    .values({
      organizationId,
      role: 'admin',
      userId,
    })
    .onConflictDoUpdate({
      set: {
        role: 'admin',
      },
      target: [OrgMembers.organizationId, OrgMembers.userId],
    });
}

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

async function upsertOrgInDatabase({
  orgId,
  name,
  stripeCustomerId,
  tx,
}: {
  orgId: string;
  name: string;
  stripeCustomerId?: string;
  tx: Transaction;
}) {
  const [org] = await tx
    .insert(Orgs)
    .values({
      id: orgId,
      name,
      slug: generateRandomName(),
      stripeCustomerId,
    })
    .onConflictDoUpdate({
      set: {
        name,
        stripeCustomerId,
        updatedAt: new Date(),
      },
      target: [Orgs.id],
    })
    .returning();

  if (!org) {
    throw new Error(
      `Failed to create or update organization for orgId: ${orgId}, name: ${name}`,
    );
  }

  return org;
}

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

// Helper function to build the return result from existing org data
async function buildOrgResult({
  org,
  tx,
  userId,
}: {
  org: {
    id: string;
    name: string;
    stripeCustomerId: string | null;
  };
  tx: Transaction;
  userId: string;
}): Promise<UpsertOrgResult> {
  // Run membership and API key creation in parallel
  const [_, apiKey] = await Promise.all([
    ensureOrgMembership({ organizationId: org.id, tx, userId }),
    ensureDefaultApiKey({ organizationId: org.id, tx, userId }),
  ]);

  return {
    apiKey: {
      id: apiKey.id,
      key: apiKey.key,
      name: apiKey.name,
    },
    org: {
      id: org.id,
      name: org.name,
      stripeCustomerId: org.stripeCustomerId || '',
    },
  };
}

// Helper function to check if we should use an existing organization
async function findExistingOrg({
  orgId,
  userId,
  tx,
}: {
  orgId?: string;
  userId: string;
  tx: Transaction;
}): Promise<{
  org: {
    id: string;
    name: string;
    stripeCustomerId: string | null;
  };
  reason: string;
} | null> {
  // Run all possible org existence checks in parallel
  const [existingMembership, existingOrgByOrgId] = await Promise.all([
    // Check 1: User already has an org membership
    tx
      .select()
      .from(OrgMembers)
      .where(eq(OrgMembers.userId, userId))
      .limit(1)
      .then((rows) => rows[0]),
    // Check 2: If orgId is provided, check if organization already exists
    orgId
      ? tx
          .select()
          .from(Orgs)
          .where(eq(Orgs.id, orgId))
          .limit(1)
          .then((rows) => rows[0])
      : null,
  ]);

  // Check 1: User already has an org membership
  if (existingMembership && !orgId) {
    const existingOrg = await tx
      .select()
      .from(Orgs)
      .where(eq(Orgs.id, existingMembership.organizationId))
      .limit(1)
      .then((rows) => rows[0]);

    if (existingOrg) {
      // Run API key check
      const apiKey = await tx
        .select()
        .from(ApiKeys)
        .where(eq(ApiKeys.organizationId, existingOrg.id))
        .limit(1)
        .then((rows) => rows[0]);

      if (apiKey) {
        return { org: existingOrg, reason: 'existing_membership' };
      }
    }
  }

  // Check 2: If orgId is provided, check if organization already exists
  if (existingOrgByOrgId) {
    console.log(
      'Organization already exists for orgId:',
      orgId,
      'using existing org:',
      existingOrgByOrgId.id,
    );
    return { org: existingOrgByOrgId, reason: 'existing_org_id' };
  }

  return null;
}

export async function upsertOrg({
  orgId,
  name,
  userId,
}: UpsertOrgParams): Promise<UpsertOrgResult> {
  return await db.transaction(async (tx) => {
    // Check for existing organizations first
    const existingOrgResult = await findExistingOrg({ orgId, tx, userId });
    if (existingOrgResult) {
      return buildOrgResult({
        org: existingOrgResult.org,
        tx,
        userId,
      });
    }

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

    // Generate unique org ID if not provided
    const finalOrgId = orgId || generateRandomName();
    let finalOrgName = name;

    // Check if organization name already exists in database
    const existingOrgByName = await tx
      .select()
      .from(Orgs)
      .where(eq(Orgs.name, name))
      .limit(1)
      .then((rows) => rows[0]);

    if (existingOrgByName) {
      // Generate a new unique name
      finalOrgName = generateUniqueOrgName();
    }

    // Final check: Double-check that the organization wasn't created by another process
    const finalCheckOrg = await tx
      .select()
      .from(Orgs)
      .where(eq(Orgs.id, finalOrgId))
      .limit(1)
      .then((rows) => rows[0]);

    if (finalCheckOrg) {
      console.log(
        'Organization was created by another process, using existing org:',
        finalCheckOrg.id,
      );
      return buildOrgResult({
        org: finalCheckOrg,
        tx,
        userId,
      });
    }

    // Upsert org in database (no Stripe customer ID initially)
    const org = await upsertOrgInDatabase({
      name: finalOrgName,
      orgId: finalOrgId,
      tx,
    });

    // Create or update Stripe customer
    console.log(
      'Creating/updating Stripe customer for org:',
      org.id,
      'name:',
      finalOrgName,
    );

    let stripeCustomer: Stripe.Customer;
    try {
      stripeCustomer = await upsertStripeCustomer({
        additionalMetadata: {
          orgName: finalOrgName,
          userId,
        },
        email: userEmail,
        name: finalOrgName,
        orgId: org.id,
      });
      if (!stripeCustomer) {
        throw new Error(
          `Failed to create or get Stripe customer for orgId: ${org.id}, name: ${finalOrgName}, email: ${userEmail}`,
        );
      }
    } catch (error) {
      if (error instanceof Error) {
        throw new Error(
          `Failed to create or get Stripe customer for orgId: ${org.id}, name: ${finalOrgName}, email: ${userEmail}. Original error: ${error.message}`,
        );
      }
      throw new Error(
        `Failed to create or get Stripe customer for orgId: ${org.id}, name: ${finalOrgName}, email: ${userEmail}`,
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

    // Auto-subscribe to free plan only if org doesn't already have a subscription
    if (!org.stripeSubscriptionId) {
      await autoSubscribeToFreePlan({
        customerId: stripeCustomer.id,
        orgId: org.id,
        tx,
      });
    }

    return buildOrgResult({
      org: { ...org, stripeCustomerId: stripeCustomer.id },
      tx,
      userId,
    });
  });
}
