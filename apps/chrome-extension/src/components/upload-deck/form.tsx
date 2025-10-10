import { api } from '@seawatts/api/chrome-extension';
import { Alert, AlertDescription, AlertTitle } from '@seawatts/ui/alert';
import { Icons } from '@seawatts/ui/icons';
import { Input } from '@seawatts/ui/input';
import { Label } from '@seawatts/ui/label';
import { Progress } from '@seawatts/ui/progress';
import type React from 'react';
import { useCallback, useState } from 'react';

import { useCompany } from '../company/context';
import { useDocument } from '../document/context';
import { Entitled } from '../entitlement/entitled';
import { NotEntitled } from '../entitlement/not-entitled';
import type { ProcessInfo } from './types';
import { uploadPitchDeck } from './upload-pitch-deck';

interface UploadPitchDeckFormProps {
  children: (props: { isPending: boolean }) => React.ReactNode;
  onSuccess?: () => void;
}

export function UploadPitchDeckForm({
  children,
  onSuccess,
}: UploadPitchDeckFormProps) {
  const apiUtils = api.useUtils();
  const { company } = useCompany();
  const { document } = useDocument();
  const [processInfo, setProcessInfo] = useState<ProcessInfo>({
    isGenerating: false,
    progress: 0,
    progressLabel: '',
  });

  const { mutateAsync: getSignedUrl } = api.document.getSignedUrl.useMutation();
  const { mutateAsync: createDocuments } = api.document.create.useMutation();
  const { mutateAsync: startExecution } =
    api.document.startParseExecution.useMutation();

  const onSubmit = useCallback(
    async (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      event.stopPropagation();
      const formData = new FormData(event.target as HTMLFormElement);
      const files = formData.getAll('files') as File[];

      await uploadPitchDeck({
        apiUtils,
        company,
        createDocuments,
        files,
        getSignedUrl,
        setProcessInfo,
        startExecution,
      });
      await apiUtils.document.lastSelected.invalidate();

      onSuccess?.();
    },
    [
      apiUtils,
      company,
      createDocuments,
      startExecution,
      getSignedUrl,
      onSuccess,
    ],
  );

  return (
    <form className="flex flex-col gap-4" onSubmit={onSubmit}>
      <div className="flex flex-col gap-y-2">
        <div className="text-sm">
          <p className="text-muted-foreground">
            The process will cover key areas such as:
          </p>
          <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-2">
            <div className="flex items-center">
              <Icons.TrendingUp className="mr-2" />
              <span>Market opportunity</span>
            </div>
            <div className="flex items-center">
              <Icons.Puzzle className="mr-2" />
              <span>Product/solution fit</span>
            </div>
            <div className="flex items-center">
              <Icons.UsersRound className="mr-2" />
              <span>Team capabilities</span>
            </div>
            <div className="flex items-center">
              <Icons.CircleDollarSign className="mr-2" />
              <span>Financial projections</span>
            </div>
            <div className="flex items-center">
              <Icons.Globe className="mr-2" />
              <span>Competitive landscape</span>
            </div>
          </div>
        </div>
      </div>
      <NotEntitled entitlement="pitch_deck_upload">
        <Alert>
          <Icons.Info />
          <AlertTitle>Upgrade Account to Import Pitch Deck</AlertTitle>
          <AlertDescription>
            This will allow our AI to generate more comprehensive and tailored
            answers.
          </AlertDescription>
        </Alert>
      </NotEntitled>

      <Entitled entitlement="pitch_deck_upload">
        <div className="mt-2 flex flex-col gap-y-2 px-4 lg:px-0">
          {document?.fileName ? (
            <div className="space-y-2">
              <Label>Selected Pitch Deck</Label>
              <div className="flex items-center gap-2 rounded-md border px-3 py-2">
                <Icons.File />
                <span className="text-ellipsis text-sm font-medium">
                  {document.fileName}
                </span>
                <span className="text-xs text-muted-foreground">
                  ({document.pageCount} pages)
                </span>
                {/* <span className="text-xs text-muted-foreground">
                  <Icons.X
                    className="mr-1 h-4 w-4"
                    onClick={() =>
                      setCompanyDetails({ ...companyDetails, document: null })
                    }
                  />
                </span> */}
              </div>
            </div>
          ) : (
            <>
              <Label htmlFor="files">Pitch Deck (PDF only, optional)</Label>
              <Input accept=".pdf" id="files" name="files" type="file" />
              <p className="text-sm text-muted-foreground">
                Tip: Make sure your pitch deck includes key information such as
                your problem statement, solution, market size, business model,
                and team.
              </p>
            </>
          )}
        </div>
      </Entitled>

      {processInfo.isGenerating && (
        <div className="flex flex-col gap-2 px-4 lg:px-0">
          <Label>{processInfo.progressLabel}</Label>
          <Progress className="w-full" value={processInfo.progress} />
        </div>
      )}

      {children({ isPending: processInfo.isGenerating })}
    </form>
  );
}
