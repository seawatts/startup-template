import { useDocument } from './context';

export interface NoDocumentProps {
  children: React.ReactNode;
}

export function NoDocument({ children }: NoDocumentProps) {
  const { hasDocument, isLoading, isSuccess } = useDocument();

  if (isLoading && !isSuccess) {
    return null;
  }

  if (hasDocument) {
    return null;
  }

  return children;
}
