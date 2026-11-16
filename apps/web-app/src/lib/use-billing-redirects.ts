'use client';

import { useORPC } from '@seawatts/api/react/react';
import { useMutation } from '@tanstack/react-query';

// Checkout and the billing portal are Stripe pages: the procedure returns
// the page's address and the browser goes there. The return addresses are
// this app's own pages.
export function useCheckout() {
  const api = useORPC();
  const mutation = useMutation(
    api.billing.createCheckoutSession.mutationOptions({
      onSuccess: ({ url }) => window.location.assign(url),
    }),
  );
  return {
    isPending: mutation.isPending,
    start: (
      choice: {
        billingInterval?: 'monthly' | 'yearly';
        planType?: 'free' | 'team';
      } = {},
    ) =>
      mutation.mutateAsync({
        ...choice,
        cancelUrl: window.location.href,
        successUrl: `${window.location.origin}/app/settings/billing?success=true`,
      }),
  };
}

export function useBillingPortal() {
  const api = useORPC();
  const mutation = useMutation(
    api.billing.createBillingPortalSession.mutationOptions({
      onSuccess: ({ url }) => window.location.assign(url),
    }),
  );
  return {
    isPending: mutation.isPending,
    open: () =>
      mutation.mutateAsync({
        returnUrl: `${window.location.origin}/app/settings/billing`,
      }),
  };
}
