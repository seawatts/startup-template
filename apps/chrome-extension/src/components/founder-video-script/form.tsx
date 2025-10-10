import { useUser } from '@clerk/chrome-extension';
import { Alert, AlertDescription, AlertTitle } from '@seawatts/ui/alert';
import { Icons } from '@seawatts/ui/custom/icons';
import { toast } from '@seawatts/ui/sonner';
import { useCallback, useState } from 'react';

import { useFounderName } from '~/hooks/use-founder-name';
import { getExistingInputs } from '~/utils/existing-inputs';
import { fetchAndStream } from '~/utils/fetch-stream';
import { useCompany } from '../company/context';
import { useDocument } from '../document/context';
import { Entitled } from '../entitlement/entitled';
import { NotEntitled } from '../entitlement/not-entitled';
import { StripeCheckoutButton } from '../stripe-checkout/button';
import type { GenerateYCVideoScriptResponse } from './script-display';
import { ScriptDisplay } from './script-display';

interface ScriptFormProps {
  children: (props: {
    isPending: boolean;
    isSuccess: boolean;
    isError: boolean;
    error: unknown;
    data: unknown;
  }) => React.ReactNode;
}

export function ScriptForm({ children }: ScriptFormProps) {
  const user = useUser();
  const [generation, setGeneration] =
    useState<GenerateYCVideoScriptResponse | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [hasFetched, setHasFetched] = useState(false);

  const { application, company } = useCompany();
  const { document } = useDocument();
  const founderName = useFounderName();

  const handleSubmit = useCallback(
    async (event?: React.FormEvent<HTMLFormElement>) => {
      if (event) {
        event.preventDefault();
        event.stopPropagation();
      }

      if (isPending || !founderName || generation || hasFetched) {
        return;
      }

      setIsPending(true);
      setIsError(false);
      setError(null);
      setHasFetched(true);
      const existingInputs = getExistingInputs();

      try {
        await fetchAndStream<GenerateYCVideoScriptResponse | undefined>(
          '/api/founder-video-script',
          {
            applicationId: application?.id,
            companyDetails: JSON.stringify(company),
            companyId: company?.id,
            documentId: document?.id,
            existingInputs,
            userId: user.user?.id,
            userName: [founderName],
          },
          (partialData) => {
            if (partialData?.lines && Array.isArray(partialData.lines)) {
              setGeneration(partialData);
            }
          },
        );
      } catch (error_) {
        console.error('Error generating founder video script:', error_);
        setIsError(true);
        setError(error_);
        toast.error('Failed to generate founder video script');
      } finally {
        setIsPending(false);
      }
    },
    [
      founderName,
      application,
      company,
      document?.id,
      user.user?.id,
      isPending,
      generation,
      hasFetched,
    ],
  );

  return (
    <form
      className="flex h-full flex-col gap-4"
      onSubmit={(event) => {
        setHasFetched(false);
        setGeneration(null);
        handleSubmit(event);
      }}
    >
      <Entitled entitlement="video_script">
        <ScriptDisplay isPending={isPending} script={generation} />
      </Entitled>
      <NotEntitled entitlement="video_script">
        <Alert>
          <Icons.Info className="text-green-500" />
          <div className="flex flex-wrap justify-between gap-6">
            <div>
              <AlertTitle>Unlock your founder video script</AlertTitle>
              <AlertDescription>
                Upgrade to unlock your founder video script.
              </AlertDescription>
            </div>
            <div>
              <StripeCheckoutButton />
            </div>
          </div>
        </Alert>
      </NotEntitled>

      {isError && (
        <div className="text-destructive">
          An error occurred while generating the script.
        </div>
      )}
      {children({
        data: generation,
        error,
        isError,
        isPending,
        isSuccess: !!generation && !isError,
      })}
    </form>
  );
}
