'use client';

import { useORPC } from '@seawatts/api/react/react';
import { StripeProvider } from '@seawatts/stripe/guards/client';
import { useQuery } from '@tanstack/react-query';
import type { ReactNode } from 'react';

// The plan guards' data comes from one oRPC read, like every other read in
// the app; StripeProvider only holds the answer.
export function BillingProvider({ children }: { children: ReactNode }) {
  const api = useORPC();
  const { data, isPending } = useQuery(
    api.billing.access.queryOptions({ staleTime: 60_000 }),
  );
  return (
    <StripeProvider
      entitlements={data?.entitlements}
      loading={isPending}
      subscriptionInfo={data?.subscriptionInfo}
    >
      {children}
    </StripeProvider>
  );
}
