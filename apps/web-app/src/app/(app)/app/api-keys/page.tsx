import { HydrationBoundary } from '@seawatts/api/react/hydration-boundary';
import { getQueryClient, orpc } from '@seawatts/api/react/server';
import { ApiKeysTable } from './_components/api-keys-table';
import { CreateApiKeyDialog } from './_components/create-api-key-dialog';

// Dynamic because oRPC queries require authenticated session context
export const dynamic = 'force-dynamic';

export default async function ApiKeysPage() {
  const queryClient = getQueryClient();

  // Prefetch API keys data on the server
  void queryClient.prefetchQuery(orpc.apiKeys.allWithLastUsage.queryOptions());

  return (
    <HydrationBoundary>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <div className="text-2xl font-bold">API Keys</div>
            <div className="text-sm text-muted-foreground">
              Create an API key to use seawatts in your applications.
            </div>
          </div>
          <CreateApiKeyDialog />
        </div>

        <ApiKeysTable />
      </div>
    </HydrationBoundary>
  );
}
