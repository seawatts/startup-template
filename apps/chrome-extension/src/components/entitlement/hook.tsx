import { useUser } from '@clerk/chrome-extension';

import { api } from '@acme/api/chrome-extension';

import { useCompany } from '../company/context';

export function useEntitlement({ entitlement }: { entitlement: string }) {
  const user = useUser();
  const { company } = useCompany();

  const entitlements = api.billing.getEntitlements.useQuery(
    { companyId: company?.id ?? '' },
    { enabled: user.isSignedIn ?? false },
  );

  const isEntitled = entitlements.data?.includes(entitlement);

  return {
    isEntitled,
    isPending: entitlements.isPending,
    isSuccess: entitlements.isSuccess,
  };
}
