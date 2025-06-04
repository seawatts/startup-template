import { useUser } from '@clerk/chrome-extension';
import type { PropsWithChildren } from 'react';
import { createContext, useContext, useMemo } from 'react';

import type { RouterOutputs } from '@acme/api';
import { api } from '@acme/api/chrome-extension';

import { useYcApp } from '~/hooks/yc/use-yc-app';

export type Company = NonNullable<
  RouterOutputs['application']['byExternalId']
>['company'];

export type Application = Omit<
  NonNullable<RouterOutputs['application']['byExternalId']>,
  'company'
>;

interface CompanyContextType {
  company?: Company;
  application?: Application;
  hasCompany: boolean;
  isLoading: boolean;
  isSuccess: boolean;
}

const CompanyContext = createContext<CompanyContextType | undefined>(undefined);

export function CompanyProvider({ children }: PropsWithChildren) {
  const user = useUser();

  const { app } = useYcApp();
  const application = api.application.byExternalId.useQuery(
    { externalId: app?.uuid ?? '' },
    {
      enabled: !!app?.uuid && (user.isSignedIn ?? false),
    },
  );

  const value = useMemo(() => {
    const { company, ...applicationWithoutCompany } = application.data ?? {};
    return {
      application: applicationWithoutCompany as Application | undefined,
      company: company as Company | undefined,
      hasCompany: !!company,
      isLoading: application.isLoading,
      isSuccess: application.isSuccess,
    };
  }, [application.data, application.isLoading, application.isSuccess]);

  return (
    <CompanyContext.Provider value={value}>{children}</CompanyContext.Provider>
  );
}

export function useCompany() {
  const context = useContext(CompanyContext);
  if (context === undefined) {
    throw new Error('useCompany must be used within a CompanyProvider');
  }
  return context;
}
