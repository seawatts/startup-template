import { HydrationBoundary } from '@seawatts/api/react/hydration-boundary';
import { getQueryClient, orpc } from '@seawatts/api/react/server';
import { ChartAreaInteractive } from './_components/chart-area-interactive';
import { RecentEventsTable } from './_components/recent-events-table';
import { SectionCards } from './_components/section-cards';

// Dynamic because oRPC queries require authenticated session context
export const dynamic = 'force-dynamic';

export default async function Page() {
  const queryClient = getQueryClient();

  // Prefetch data for the dashboard components
  void queryClient.prefetchQuery(orpc.apiKeys.allWithLastUsage.queryOptions());
  void queryClient.prefetchQuery(orpc.org.current.queryOptions());

  return (
    <HydrationBoundary>
      <div className="flex flex-col gap-4 md:gap-6">
        <SectionCards />
        <ChartAreaInteractive />
        <RecentEventsTable />
      </div>
    </HydrationBoundary>
  );
}
