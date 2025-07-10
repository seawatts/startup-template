import { Label } from '@acme/ui/label';
import { Progress } from '@acme/ui/progress';
import { useUser } from '@clerk/chrome-extension';
import type React from 'react';
import { useCallback, useState } from 'react';

import { useFounderName } from '~/hooks/use-founder-name';
import { useCompany } from '../company/context';
import { useDocument } from '../document/context';
import { handleSubmit } from './handle-submit';
import type { ProcessInfo } from './types';

interface GenerateApplicationFormProps {
  children: (props: { isPending: boolean }) => React.ReactNode;
  onSuccess?: () => void;
}

export function GenerateApplicationForm({
  children,
  onSuccess,
}: GenerateApplicationFormProps) {
  const user = useUser();
  const { company, application } = useCompany();
  const { document } = useDocument();
  const founderName = useFounderName();
  const [processInfo, setProcessInfo] = useState<ProcessInfo>({
    isGenerating: false,
    progress: 0,
    progressLabel: '',
  });

  const onSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      event.stopPropagation();
      await handleSubmit({
        application,
        company,
        document,
        founderName,
        setProcessInfo,
        user,
      });

      onSuccess?.();
    },
    [user, company, founderName, document, application, onSuccess],
  );

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      {processInfo.isGenerating && (
        <div className="flex flex-col gap-2 px-4 lg:px-0">
          <Label>{processInfo.progressLabel}</Label>
          <Progress className="w-full" value={processInfo.progress} />
        </div>
      )}

      {children({ isPending: processInfo.isGenerating })}
      <p className="flex items-end justify-end text-right text-sm text-muted-foreground">
        * Does NOT override existing application text
      </p>
    </form>
  );
}
