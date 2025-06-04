import { useDocument } from './context';

export interface DocumentUploadedProps {
  children: React.ReactNode;
}

export function DocumentUploaded({ children }: DocumentUploadedProps) {
  const { hasDocument, isLoading, isSuccess } = useDocument();

  if (isLoading && !isSuccess) {
    return null;
  }

  if (!hasDocument) {
    return null;
  }

  return children;
}
