import { useEntitlement } from './hook';
import type { Entitlement } from './types';

export interface IsEntitledProps {
  entitlement: Entitlement;
  children: React.ReactNode;
}

export function Entitled({ entitlement, children }: IsEntitledProps) {
  const { isEntitled, isPending, isSuccess } = useEntitlement({ entitlement });

  if (isPending && !isSuccess) {
    return null;
  }

  return isEntitled ? children : null;
}
