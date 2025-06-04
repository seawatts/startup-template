import { useIsPaying } from './hook';

export interface NotPayingProps {
  priceLookupKey?:
    | 'UNICORN_ONE_OFF'
    | 'ACCELERATE_ONE_OFF'
    | 'FREE_ONE_OFF'
    | 'UNICORN_UPGRADE_FROM_ACCELERATE_ONE_OFF';
  children: React.ReactNode;
}

export function NotPaying({ priceLookupKey, children }: NotPayingProps) {
  const { isPaying, currentPlan, isPending } = useIsPaying();

  // If still loading, don't render anything
  if (isPending) {
    return null;
  }

  // If the user is paying and no specific plan is required, don't render children
  if (isPaying && !priceLookupKey) {
    return null;
  }

  // If the user is paying and their plan matches the required plan, don't render children
  if (isPaying && priceLookupKey && currentPlan === priceLookupKey) {
    return null;
  }

  // In all other cases (not paying, or paying but wrong plan), render children
  return children;
}
