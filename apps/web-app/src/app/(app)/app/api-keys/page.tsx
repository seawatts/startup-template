import { ApiKeysTable } from './_components/api-keys-table';
import { CreateApiKeyDialog } from './_components/create-api-key-dialog';

// The heading renders at once; the table reads the keys through oRPC on the
// client and shows its own skeleton while it waits.
export default function ApiKeysPage() {
  return (
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
  );
}
