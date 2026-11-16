import { ORPCError } from '@orpc/server';
import { Orgs } from '@seawatts/db/schema/organizations';
import {
  BILLING_INTERVALS,
  createBillingPortalSession,
  createCheckoutSession,
  getOrCreateCustomer,
  PLAN_TYPES,
  stripe,
} from '@seawatts/stripe';
import type { EntitlementsRecord } from '@seawatts/stripe/guards/entitlement-types';
import { customerEntitlements } from '@seawatts/stripe/guards/entitlements-server';
import { subscriptionInfo } from '@seawatts/stripe/guards/subscription-server';
import { eq } from 'drizzle-orm';
import type Stripe from 'stripe';
import { z } from 'zod';
import { protectedProcedure, publicProcedure } from '../orpc';

export const billingRouter = {
  // What the app's plan guards read (StripeProvider): the subscription flags
  // and the entitlements of the active organization. Signed out, or with no
  // organization yet, it answers "no plan" instead of failing, because the
  // provider wraps the marketing pages too.
  access: publicProcedure
    .route({ method: 'GET' })
    .handler(async ({ context: ctx }) => {
      const none = {
        entitlements: {} as EntitlementsRecord,
        subscriptionInfo: subscriptionInfo(null, null),
      };
      if (!ctx.auth.orgId) return none;
      const [org] = await ctx.authDb
        .select({
          customerId: Orgs.stripeCustomerId,
          status: Orgs.stripeSubscriptionStatus,
        })
        .from(Orgs)
        .where(eq(Orgs.id, ctx.auth.orgId))
        .limit(1);
      if (!org) return none;
      return {
        entitlements: org.customerId
          ? await customerEntitlements(org.customerId)
          : none.entitlements,
        subscriptionInfo: subscriptionInfo(org.status, org.customerId),
      };
    }),

  // Cancel subscription at period end
  cancelSubscription: protectedProcedure.handler(async ({ context: ctx }) => {
    if (!ctx.auth.orgId)
      throw new ORPCError('BAD_REQUEST', {
        message: 'Organization ID is required',
      });

    const org = await ctx.authDb
      .select()
      .from(Orgs)
      .where(eq(Orgs.id, ctx.auth.orgId))
      .limit(1)
      .then((rows) => rows[0]);

    if (!org || !org.stripeSubscriptionId) {
      throw new ORPCError('BAD_REQUEST', {
        message: 'No active subscription found',
      });
    }

    try {
      const subscription = (await stripe.subscriptions.update(
        org.stripeSubscriptionId,
        {
          cancel_at_period_end: true,
        },
      )) as Stripe.Subscription;

      // Update local database
      await ctx.authDb
        .update(Orgs)
        .set({
          stripeSubscriptionStatus: subscription.status,
        })
        .where(eq(Orgs.id, ctx.auth.orgId));

      return {
        cancelAtPeriodEnd: subscription.cancel_at_period_end,
        success: true,
      };
    } catch (error) {
      console.error('Error canceling subscription:', error);
      throw new ORPCError('BAD_REQUEST', {
        message: 'Failed to cancel subscription',
      });
    }
  }),

  // Create a billing portal session for managing existing subscription
  createBillingPortalSession: protectedProcedure
    .input(
      z.object({
        returnUrl: z.string().url(),
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });

      const org = await ctx.authDb
        .select()
        .from(Orgs)
        .where(eq(Orgs.id, ctx.auth.orgId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!org || !org.stripeCustomerId) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'No active subscription found',
        });
      }

      const session = await createBillingPortalSession({
        customerId: org.stripeCustomerId,
        returnUrl: input.returnUrl,
      });

      if (!session.url) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Failed to create billing portal session',
        });
      }

      return {
        sessionId: session.id,
        url: session.url,
      };
    }),

  // Create a checkout session for new subscription
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        billingInterval: z.enum(['monthly', 'yearly']).default('monthly'),
        cancelUrl: z.string().url(),
        planType: z.enum(['free', 'team']).default('team'),
        successUrl: z.string().url(),
      }),
    )
    .handler(async ({ context: ctx, input }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });

      const org = await ctx.authDb
        .select()
        .from(Orgs)
        .where(eq(Orgs.id, ctx.auth.orgId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!org) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization not found',
        });
      }

      // Create or get Stripe customer
      let customerId = org.stripeCustomerId;

      if (!customerId) {
        // Get user details from database for creating customer
        const user = ctx.user;
        if (!user || !user.email) {
          throw new ORPCError('BAD_REQUEST', {
            message: 'User email is required to create Stripe customer',
          });
        }

        const customer = await getOrCreateCustomer({
          email: user.email,
          metadata: {
            orgId: org.id,
            userId: ctx.auth.userId as string,
          },
          name: org.name,
        });

        if (!customer) {
          throw new ORPCError('BAD_REQUEST', {
            message: 'Failed to create Stripe customer',
          });
        }

        customerId = customer.id;

        // Update org with customer ID
        await ctx.authDb
          .update(Orgs)
          .set({
            stripeCustomerId: customerId,
          })
          .where(eq(Orgs.id, ctx.auth.orgId));
      }

      // Create checkout session
      const session = await createCheckoutSession({
        billingInterval:
          input.billingInterval === 'yearly'
            ? BILLING_INTERVALS.YEARLY
            : BILLING_INTERVALS.MONTHLY,
        cancelUrl: input.cancelUrl,
        customerId,
        orgId: ctx.auth.orgId,
        planType: input.planType === 'free' ? PLAN_TYPES.FREE : PLAN_TYPES.TEAM,
        successUrl: input.successUrl,
      });

      if (!session.url) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Failed to create checkout session',
        });
      }

      return {
        sessionId: session.id,
        url: session.url,
      };
    }),

  // Get organization billing details
  getBillingDetails: protectedProcedure
    .route({ method: 'GET' })
    .handler(async ({ context: ctx }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });

      const org = await ctx.authDb
        .select()
        .from(Orgs)
        .where(eq(Orgs.id, ctx.auth.orgId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!org) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization not found',
        });
      }

      return {
        customerId: org.stripeCustomerId,
        name: org.name,
        subscriptionId: org.stripeSubscriptionId,
        subscriptionStatus: org.stripeSubscriptionStatus,
      };
    }),

  // Get invoices for the current organization
  getInvoices: protectedProcedure
    .input(
      z.object({
        limit: z.number().min(1).max(100).default(20),
        startingAfter: z.string().optional(),
      }),
    )
    .route({ method: 'GET' })
    .handler(async ({ context: ctx, input }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });

      const org = await ctx.authDb
        .select()
        .from(Orgs)
        .where(eq(Orgs.id, ctx.auth.orgId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!org || !org.stripeCustomerId) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'No active subscription found',
        });
      }

      const invoices = await stripe.invoices.list({
        customer: org.stripeCustomerId,
        limit: input.limit,
        starting_after: input.startingAfter,
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
    }),

  // Get subscription details from Stripe
  getSubscriptionDetails: protectedProcedure
    .route({ method: 'GET' })
    .handler(async ({ context: ctx }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });

      const org = await ctx.authDb
        .select()
        .from(Orgs)
        .where(eq(Orgs.id, ctx.auth.orgId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!org || !org.stripeSubscriptionId) {
        return null;
      }

      try {
        const subscription = (await stripe.subscriptions.retrieve(
          org.stripeSubscriptionId,
          {
            expand: ['latest_invoice', 'customer'],
          },
        )) as Stripe.Subscription;

        return {
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          canceledAt: subscription.canceled_at,
          id: subscription.id,
          items: subscription.items.data.map((item) => ({
            id: item.id,
            price: {
              currency: item.price.currency,
              id: item.price.id,
              recurring: item.price.recurring,
              unitAmount: item.price.unit_amount,
            },
            quantity: item.quantity,
          })),
          latestInvoice: subscription.latest_invoice
            ? {
                amount: (subscription.latest_invoice as Stripe.Invoice).total,
                hostedInvoiceUrl: (
                  subscription.latest_invoice as Stripe.Invoice
                ).hosted_invoice_url,
                id: (subscription.latest_invoice as Stripe.Invoice).id,
                status: (subscription.latest_invoice as Stripe.Invoice).status,
              }
            : null,
          status: subscription.status,
          trialEnd: subscription.trial_end,
          trialStart: subscription.trial_start,
        };
      } catch (error) {
        console.error('Error retrieving subscription:', error);
        return null;
      }
    }),
  // Get subscription status for the current organization
  getSubscriptionStatus: protectedProcedure
    .route({ method: 'GET' })
    .handler(async ({ context: ctx }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });

      const org = await ctx.authDb
        .select()
        .from(Orgs)
        .where(eq(Orgs.id, ctx.auth.orgId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!org) {
        return {
          customerId: null,
          dailyUsage: 0,
          hasAny: false,
          isActive: false,
          isCanceled: false,
          isPaid: false,
          isPastDue: false,
          isTrialing: false,
          monthlyUsage: 0,
          status: null,
          subscriptionId: null,
        };
      }

      const status = org.stripeSubscriptionStatus;
      const isPaid = ['active', 'past_due', 'trialing'].includes(status || '');

      return {
        customerId: org.stripeCustomerId,
        dailyUsage: 0,
        hasAny: !!status,
        isActive: status === 'active',
        isCanceled: status === 'canceled',
        isPaid,
        isPastDue: status === 'past_due',
        isTrialing: status === 'trialing',
        monthlyUsage: 0,
        status,
        subscriptionId: org.stripeSubscriptionId,
      };
    }),

  // Get usage-based billing information
  getUsageInfo: protectedProcedure
    .route({ method: 'GET' })
    .handler(async ({ context: ctx }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });

      const org = await ctx.authDb
        .select()
        .from(Orgs)
        .where(eq(Orgs.id, ctx.auth.orgId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!org || !org.stripeSubscriptionId) {
        return null;
      }

      try {
        const subscription = (await stripe.subscriptions.retrieve(
          org.stripeSubscriptionId,
        )) as Stripe.Subscription;

        // Get usage records for metered items
        const usageRecords = await Promise.all(
          subscription.items.data
            .filter((item) => item.price.recurring?.usage_type === 'metered')
            .map(async (item) => {
              // Note: This would require the correct Stripe API method
              // For now, return basic item info
              return {
                itemId: item.id,
                period: {
                  end: Date.now() / 1000 + 30 * 24 * 60 * 60, // Current timestamp as fallback
                  start: Date.now() / 1000, // 30 days from now
                },
                priceId: item.price.id, // Would need to implement usage tracking
                totalUsage: 0,
              };
            }),
        );

        return {
          subscriptionId: subscription.id,
          usageRecords,
        };
      } catch (error) {
        console.error('Error retrieving usage info:', error);
        return null;
      }
    }),

  // Reactivate subscription (remove cancel at period end)
  reactivateSubscription: protectedProcedure.handler(
    async ({ context: ctx }) => {
      if (!ctx.auth.orgId)
        throw new ORPCError('BAD_REQUEST', {
          message: 'Organization ID is required',
        });

      const org = await ctx.authDb
        .select()
        .from(Orgs)
        .where(eq(Orgs.id, ctx.auth.orgId))
        .limit(1)
        .then((rows) => rows[0]);

      if (!org || !org.stripeSubscriptionId) {
        throw new ORPCError('BAD_REQUEST', {
          message: 'No active subscription found',
        });
      }

      try {
        const subscription = (await stripe.subscriptions.update(
          org.stripeSubscriptionId,
          {
            cancel_at_period_end: false,
          },
        )) as Stripe.Subscription;

        // Update local database
        await ctx.authDb
          .update(Orgs)
          .set({
            stripeSubscriptionStatus: subscription.status,
          })
          .where(eq(Orgs.id, ctx.auth.orgId));

        return {
          cancelAtPeriodEnd: subscription.cancel_at_period_end,
          success: true,
        };
      } catch (error) {
        console.error('Error reactivating subscription:', error);
        throw new ORPCError('BAD_REQUEST', {
          message: 'Failed to reactivate subscription',
        });
      }
    },
  ),
};
