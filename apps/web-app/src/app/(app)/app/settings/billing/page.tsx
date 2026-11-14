import { HydrationBoundary } from '@seawatts/api/react/hydration-boundary';
import { getQueryClient, orpc } from '@seawatts/api/react/server';
import { BillingSettings } from './_components/billing-settings';

// Dynamic because it uses session-dependent data
export const dynamic = 'force-dynamic';

export default async function BillingPage() {
  const queryClient = getQueryClient();

  // Prefetch billing data
  void queryClient.prefetchQuery(
    orpc.billing.getSubscriptionStatus.queryOptions(),
  );
  void queryClient.prefetchQuery(
    orpc.billing.getSubscriptionDetails.queryOptions(),
  );
  void queryClient.prefetchQuery(
    orpc.billing.getInvoices.queryOptions({ input: {} }),
  );

  return (
    <HydrationBoundary>
      <BillingSettings />
    </HydrationBoundary>
  );
}
