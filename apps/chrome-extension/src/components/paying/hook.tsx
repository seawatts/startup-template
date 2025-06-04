import { useUser } from '@clerk/chrome-extension';

import { api } from '@acme/api/chrome-extension';

import { useCompany } from '../company/context';

export function useIsPaying() {
  const user = useUser();
  const { company } = useCompany();

  const price = api.billing.getCompanyPrice.useQuery(
    { companyId: company?.id ?? '' },
    { enabled: user.isSignedIn ?? false },
  );

  let isPaying = false;

  if (price.data?.lookup_key && price.data.lookup_key !== 'FREE_ONE_OFF') {
    isPaying = true;
  }

  return {
    currentPlan: price.data?.lookup_key as
      | 'UNICORN_ONE_OFF'
      | 'ACCELERATE_ONE_OFF'
      | 'UNICORN_UPGRADE_FROM_ACCELERATE_ONE_OFF'
      | 'FREE_ONE_OFF'
      | null
      | undefined,
    isPaying,
    isPending: price.isPending,
    isSuccess: price.isSuccess,
  };
}
