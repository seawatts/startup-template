import { HydrationBoundary } from '@seawatts/api/react/hydration-boundary';
import { OrganizationSettings } from './_components/organization-settings';

export default async function OrganizationSettingsPage() {
  return (
    <HydrationBoundary>
      <div className="flex-1 xl:max-w-1/2">
        <OrganizationSettings />
      </div>
    </HydrationBoundary>
  );
}
