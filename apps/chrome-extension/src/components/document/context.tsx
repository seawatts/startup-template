import type { RouterOutputs } from '@seawatts/api';
import { api } from '@seawatts/api/chrome-extension';
import type { PropsWithChildren } from 'react';
import { createContext, useContext, useMemo } from 'react';

import { useCompany } from '../company/context';

export type Document = RouterOutputs['document']['lastSelected'];

interface DocumentContextType {
  document?: Document;
  hasDocument: boolean;
  isLoading: boolean;
  isSuccess: boolean;
}

const DocumentContext = createContext<DocumentContextType | undefined>(
  undefined,
);

export function DocumentProvider({ children }: PropsWithChildren) {
  const { company } = useCompany();

  const dbDocument = api.document.lastSelected.useQuery(
    {
      companyId: company?.id ?? '',
    },
    {
      enabled: !!company?.id,
    },
  );

  const hasDocument = !!dbDocument.data?.id;

  const value = useMemo(
    () => ({
      document: dbDocument.data,
      hasDocument,
      isLoading: dbDocument.isLoading,
      isSuccess: dbDocument.isSuccess,
    }),
    [dbDocument.data, hasDocument, dbDocument.isLoading, dbDocument.isSuccess],
  );

  return (
    <DocumentContext.Provider value={value}>
      {children}
    </DocumentContext.Provider>
  );
}

export function useDocument() {
  const context = useContext(DocumentContext);
  if (context === undefined) {
    throw new Error('useDocument must be used within a DocumentProvider');
  }
  return context;
}
