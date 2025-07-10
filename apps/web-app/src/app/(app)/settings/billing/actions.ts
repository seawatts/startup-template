'use server';

import { getApi } from '@acme/api/server';
import { createSafeActionClient } from 'next-safe-action';
import Stripe from 'stripe';
import { z } from 'zod';
import { env } from '~/env.server';
import type { StripePortalResponse } from './types';

// Initialize Stripe
const stripe = new Stripe(env.STRIPE_SECRET_KEY ?? '');

// Create the action client
const action = createSafeActionClient();

// Server actions
export const getStripePortalLink = action
  .schema(
    z.object({
      orgId: z.string(),
      returnUrl: z.string(),
    }),
  )
  .action(async ({ parsedInput }) => {
    try {
      const { orgId: _orgId, returnUrl: _returnUrl } = parsedInput;
      const _api = await getApi();
      // const organization = await api.getOrganization.fetch({
      //   org_id: orgId,
      // });

      // if (!organization) {
      //   return { success: false, error: 'Organization not found' };
      // }

      // if (!organization.org.stripe_customer_id) {
      //   return { success: false, error: 'No Stripe customer found' };
      // }

      // const session = await stripe.billingPortal.sessions.create({
      //   customer: organization.org.stripe_customer_id,
      //   return_url: returnUrl,
      // });

      return {
        data: { url: 'https://www.google.com' } as StripePortalResponse,
        success: true,
      };
    } catch (error) {
      return {
        error,
        message: 'Failed to create portal session',
        success: false,
      };
    }
  });

async function getPriceByLookupKey(props: { lookupKey: string }): Promise<
  | {
      success: true;
      data: Stripe.Price;
      error?: never;
    }
  | {
      success: false;
      error: string | Error | unknown;
      data?: never;
    }
> {
  try {
    const { lookupKey } = props;

    const prices = await stripe.prices.list({
      active: true,
      limit: 1,
      lookup_keys: [lookupKey],
    });

    if (!prices.data.length) {
      return {
        error: `No active price found with lookup key: ${lookupKey}`,
        success: false,
      };
    }

    if (!prices.data[0]) {
      return {
        error: `No active price found with lookup key: ${lookupKey}`,
        success: false,
      };
    }

    return {
      data: prices.data[0],
      success: true,
    };
  } catch (error) {
    return {
      error,
      success: false,
    };
  }
}

export const getStripeCheckoutLink = action
  .schema(
    z.object({
      cancelUrl: z.string(),
      meteredPriceLookupKey: z.string(),
      orgId: z.string(),
      priceLookupKey: z.string(),
      successUrl: z.string(),
    }),
  )
  .action(async ({ parsedInput }) => {
    try {
      const {
        orgId,
        successUrl,
        cancelUrl,
        priceLookupKey,
        meteredPriceLookupKey,
      } = parsedInput;
      const _api = await getApi();
      // const organization = await api.getOrganization.fetch({
      //   org_id: orgId,
      // });

      // if (!organization) {
      //   return { success: false, error: 'Organization not found' };
      // }

      // if (!organization.org.stripe_customer_id) {
      //   return { success: false, error: 'No Stripe customer found' };
      // }

      const flatPrice = await getPriceByLookupKey({
        lookupKey: priceLookupKey,
      });

      const eventsPrice = await getPriceByLookupKey({
        lookupKey: meteredPriceLookupKey,
      });

      if (!flatPrice.success || !eventsPrice.success) {
        return {
          error: 'Failed to retrieve prices',
          success: false,
        };
      }

      const checkoutSession = await stripe.checkout.sessions.create({
        automatic_tax: { enabled: true },
        billing_address_collection: 'auto',
        cancel_url: cancelUrl,
        // client_reference_id: organization.org.stripe_customer_id,
        consent_collection: {
          payment_method_reuse_agreement: {
            position: 'auto',
          },
          terms_of_service: 'required',
        },
        currency: 'USD',
        // customer: organization.org.stripe_customer_id,
        customer_update: {
          address: 'auto',
        },
        line_items: [
          {
            adjustable_quantity: {
              enabled: false,
            },
            price: flatPrice.data.id,
            quantity: 1,
          },
          {
            price: eventsPrice.data.id,
            quantity: 1,
          },
        ],
        metadata: {
          orgId,
        },
        mode: 'subscription',
        success_url: successUrl,
      });

      return {
        data: { url: checkoutSession.url },
        success: true,
      };
    } catch (error) {
      return {
        error,
        message: 'Failed to create checkout session',
        success: false,
      };
    }
  });
export const getStripeInvoices = action
  .schema(
    z.object({
      limit: z.number().default(10),
      orgId: z.string(),
      startingAfter: z.string().optional(),
    }),
  )
  .action(async ({ parsedInput }) => {
    try {
      const { orgId: _orgId, limit: _limit } = parsedInput;

      const _api = await getApi();
      // const organization = await api.getOrganization.fetch({
      //   org_id: orgId,
      // });

      // if (!organization) {
      //   return { success: false, error: 'Organization not found' };
      // }

      // if (!organization.org.stripe_customer_id) {
      //   return { success: false, error: 'No Stripe customer found' };
      // }

      // const invoices = await stripe.invoices
      //   .list({
      //     customer: organization.org.stripe_customer_id,
      //   })
      //   .autoPagingToArray({ limit });

      return {
        data: [], // invoices.filter(
        success: true,
        //   (invoice) => invoice.status !== 'draft' && invoice.status !== 'void',
        // ),
      };
    } catch (error) {
      return {
        error,
        message: 'Failed to fetch invoices',
        success: false,
      };
    }
  });
