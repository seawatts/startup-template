import logoIcon from 'data-base64:~/../assets/icon.png';
import { cn } from '@seawatts/ui';
import { Button } from '@seawatts/ui/button';
import { Icons } from '@seawatts/ui/icons';
import { Label } from '@seawatts/ui/label';
import { formatDistanceToNow } from 'date-fns';
import pluralize from 'pluralize';
import { useState } from 'react';

import { useDocument } from '../document/context';
import { DocumentUploaded } from '../document/document-uploaded';
import { NoDocument } from '../document/no-document';
import { UploadPitchDeckDialog } from './dialog';

export function UploadPitchDeckButton({
  withSelectedPitchDeckLabel,
  className,
}: {
  withSelectedPitchDeckLabel?: boolean;
  className?: string;
}) {
  const { document } = useDocument();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const pageCount = document?.pageCount || 0;

  return (
    <>
      <DocumentUploaded>
        <div className="space-y-2">
          {(withSelectedPitchDeckLabel ?? true) && (
            <Label>Selected Pitch Deck</Label>
          )}
          <div className="flex w-full items-center gap-2 rounded-md border px-3 py-2">
            <div className="flex flex-1 flex-col gap-2">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Icons.File />
                  <span className="text-ellipsis text-sm font-medium">
                    {document?.fileName}
                  </span>
                </div>
                <span className="text-xs text-muted-foreground">
                  ({pageCount} {pluralize('page', pageCount)})
                </span>
              </div>

              <span className="text-xs text-muted-foreground">
                Uploaded{' '}
                {formatDistanceToNow(document?.createdAt ?? new Date(), {
                  addSuffix: true,
                })}
              </span>
            </div>
          </div>
        </div>
      </DocumentUploaded>
      <NoDocument>
        <Button
          className={cn('mb-2 flex w-full items-center', className)}
          onClick={(event) => {
            event.preventDefault();
            event.stopPropagation();
            setIsDialogOpen(true);
          }}
          type="button"
        >
          <img alt="Acme" className="mb-0.5 mr-2 size-5" src={logoIcon} />
          Upload Your Deck
        </Button>
      </NoDocument>

      <UploadPitchDeckDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}
