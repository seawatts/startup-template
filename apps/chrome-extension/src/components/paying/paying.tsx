import { useIsPaying } from './hook';

export interface IsPayingProps {
  priceLookupKey?:
    | 'UNICORN_ONE_OFF'
    | 'ACCELERATE_ONE_OFF'
    | 'UNICORN_UPGRADE_FROM_ACCELERATE_ONE_OFF';
  children: React.ReactNode;
}

export function Paying({ priceLookupKey, children }: IsPayingProps) {
  const { isPaying, currentPlan, isPending, isSuccess } = useIsPaying();

  if (isPending && !isSuccess) {
    return null;
  }

  if (!isPaying || (priceLookupKey && currentPlan !== priceLookupKey)) {
    return null;
  }

  return children;
}
