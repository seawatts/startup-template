import { stripe } from '../index';
import type { EntitlementKey, EntitlementsRecord } from './entitlement-types';

// What a Stripe customer's active subscriptions entitle it to, by lookup key.
// Callers are API procedures, which know the organization and pass its
// customer id: nothing here reads a session or a request.
export async function customerEntitlements(
  customerId: string,
): Promise<EntitlementsRecord> {
  try {
    // Get the customer's active subscriptions
    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      expand: ['data.items.data.price'],
      status: 'active',
    });

    if (subscriptions.data.length === 0) {
      return {} as EntitlementsRecord;
    }

    // Create a map of entitlement features
    const entitlementMap: Partial<EntitlementsRecord> = {};

    // Check each subscription for product features
    for (const subscription of subscriptions.data) {
      for (const item of subscription.items.data) {
        if (item.price.product) {
          const productId =
            typeof item.price.product === 'string'
              ? item.price.product
              : item.price.product.id;

          // Fetch product features separately
          try {
            const productFeatures =
              await stripe.products.listFeatures(productId);

            for (const feature of productFeatures.data) {
              if (feature.entitlement_feature?.lookup_key) {
                const lookupKey = feature.entitlement_feature
                  .lookup_key as EntitlementKey;
                entitlementMap[lookupKey] = true;
              }
            }
          } catch (featureError) {
            console.error('Error fetching product features:', featureError);
          }
        }
      }
    }

    return entitlementMap as EntitlementsRecord;
  } catch (error) {
    console.error('Error fetching customer entitlements:', error);
    return {} as EntitlementsRecord;
  }
}
