import type { SubscriptionInfo } from './entitlement-types';

// The flags the app's guards read, from an organization's stored Stripe
// subscription status. Pure: the procedure that serves it reads the row.
export function subscriptionInfo(
  status: string | null,
  customerId: string | null,
): SubscriptionInfo {
  return {
    customerId,
    hasAny: !!status,
    isActive: status === 'active',
    isCanceled: status === 'canceled',
    isPaid: ['active', 'past_due', 'trialing'].includes(status || ''),
    isPastDue: status === 'past_due',
    isTrialing: status === 'trialing',
    status,
  };
}
