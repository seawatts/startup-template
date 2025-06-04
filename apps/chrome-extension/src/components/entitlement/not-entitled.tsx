import { useEntitlement } from './hook';
import type { Entitlement } from './types';

export interface IsNotEntitledProps {
  entitlement: Entitlement;
  children: React.ReactNode;
}

export function NotEntitled({ entitlement, children }: IsNotEntitledProps) {
  const { isEntitled, isPending, isSuccess } = useEntitlement({ entitlement });

  if (isPending && !isSuccess) {
    return null;
  }

  return isEntitled ? null : children;
}
