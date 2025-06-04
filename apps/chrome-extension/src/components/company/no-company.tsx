import { useCompany } from './context';

export interface NoCompanyProps {
  children: React.ReactNode;
}

export function NoCompany({ children }: NoCompanyProps) {
  const { hasCompany, isLoading, isSuccess } = useCompany();

  if (isLoading && !isSuccess) {
    return null;
  }

  if (hasCompany) {
    return null;
  }

  return children;
}
