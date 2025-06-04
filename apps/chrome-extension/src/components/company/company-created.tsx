import { useCompany } from './context';

export interface CompanyCreatedProps {
  children: React.ReactNode;
}

export function CompanyCreated({ children }: CompanyCreatedProps) {
  const { hasCompany, isLoading, isSuccess } = useCompany();

  if (isLoading && !isSuccess) {
    return null;
  }

  if (!hasCompany) {
    return null;
  }

  return children;
}
