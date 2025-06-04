import { formatDistanceToNow } from 'date-fns';
import pluralize from 'pluralize';
import type React from 'react';
import { useCallback, useState } from 'react';

import { api } from '@acme/api/chrome-extension';
import { Button } from '@acme/ui/button';
import { Icons } from '@acme/ui/icons';
import { Input } from '@acme/ui/input';
import { Label } from '@acme/ui/label';
import { Progress } from '@acme/ui/progress';

import { useCompany } from '../company/context';
import { Entitled } from '../entitlement/entitled';
import type { ProcessInfo } from '../upload-deck/types';
import { uploadPitchDeck } from '../upload-deck/upload-pitch-deck';
import { useDocument } from './context';

export function UploadPitchDeckForm() {
  const apiUtils = api.useUtils();
  const { company } = useCompany();
  const { document } = useDocument();
  const [isShowingForm, setIsShowingForm] = useState(false);
  const [processInfo, setProcessInfo] = useState<ProcessInfo>({
    isGenerating: false,
    progress: 0,
    progressLabel: '',
  });

  const { mutateAsync: getSignedUrl } = api.document.getSignedUrl.useMutation();
  const { mutateAsync: createDocuments } = api.document.create.useMutation();
  const { mutateAsync: startExecution } =
    api.document.startParseExecution.useMutation();

  const handleFileChange = useCallback(
    async (event: React.ChangeEvent<HTMLInputElement>) => {
      const files = [...(event.target.files || [])];
      if (files.length === 0) return;

      await uploadPitchDeck({
        apiUtils,
        company,
        createDocuments,
        files,
        getSignedUrl,
        setProcessInfo,
        startExecution,
      });
      await apiUtils.document.lastSelected.invalidate({
        companyId: company?.id ?? '',
      });
      setIsShowingForm(false);
    },
    [apiUtils, company, createDocuments, getSignedUrl, startExecution],
  );

  const handleRemoveDocument = useCallback(() => {
    setIsShowingForm(true);
  }, []);

  return (
    <Entitled entitlement="pitch_deck_upload">
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-y-2 px-4 lg:px-0">
          {document?.fileName && !isShowingForm ? (
            <div className="space-y-2">
              <div className="flex w-full items-center gap-2">
                <div className="flex flex-1 flex-col gap-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium">
                      {document.fileName}
                      <span className="text-xs text-muted-foreground">
                        {' '}
                        ({document.pageCount ?? 0}{' '}
                        {pluralize('page', document.pageCount ?? 0)})
                      </span>
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleRemoveDocument}
                    >
                      <Icons.X />
                      <span className="sr-only">Remove document</span>
                    </Button>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    Uploaded{' '}
                    {formatDistanceToNow(document.createdAt ?? new Date(), {
                      addSuffix: true,
                    })}
                  </span>
                </div>
              </div>
            </div>
          ) : (
            <>
              <Label htmlFor="files">Pitch Deck (PDF only)</Label>
              <Input
                id="files"
                name="files"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
              />
              <p className="text-sm text-muted-foreground">
                Tip: Make sure your pitch deck includes key information such as
                your problem statement, solution, market size, business model,
                and team.
              </p>
            </>
          )}
        </div>

        {processInfo.isGenerating && (
          <div className="flex flex-col gap-2 px-4 lg:px-0">
            <div className="flex items-center gap-2">
              <Icons.Spinner />
              <Label>{processInfo.progressLabel}</Label>
            </div>
            <Progress value={processInfo.progress} className="w-full" />
          </div>
        )}
      </div>
    </Entitled>
  );
}
