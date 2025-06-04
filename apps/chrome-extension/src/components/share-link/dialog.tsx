import { api } from '@acme/api/chrome-extension';
import { Button } from '@acme/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@acme/ui/dialog';
import { isDesktop } from '@acme/ui/hooks/use-media-query';
import { Icons } from '@acme/ui/icons';

import { useChromePortal } from '~/hooks/use-chrome-portal';
import { useCompany } from '../company/context';
import { ShareLinkForm } from './form';

type ShareLinkDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ShareLinkDialog({ isOpen, onClose }: ShareLinkDialogProps) {
  const portalElement = useChromePortal();
  const { company, application } = useCompany();
  const getShareLink = api.application.getShareLink.useQuery(
    {
      applicationId: application?.id ?? '',
    },
    {
      enabled: !!company?.id && !!application?.id,
    },
  );
  const title = 'Share Link';
  const description = 'Share the link with your friends and family!';

  if (isDesktop()) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent portalContainer={portalElement}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <ShareLinkForm>
            {({ isPending, hasShareLink }) => (
              <div className="flex justify-between">
                <div>
                  <Button variant="outline" asChild>
                    <a
                      href={getShareLink.data?.uniqueLink}
                      target="_blank"
                      className="flex items-center gap-2"
                      rel="noreferrer"
                    >
                      View Feedback
                      <Icons.ExternalLink />
                    </a>
                  </Button>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={(event) => {
                      event.preventDefault();
                      event.stopPropagation();
                      onClose();
                    }}
                  >
                    Close
                  </Button>
                  {!hasShareLink && (
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Icons.Spinner className="mr-2" />}
                      {isPending ? 'Creating...' : 'Create'}
                    </Button>
                  )}
                  {hasShareLink && (
                    <Button type="submit" disabled={isPending}>
                      {isPending && <Icons.Spinner className="mr-2" />}
                      {isPending ? 'Updating...' : 'Update'}
                    </Button>
                  )}
                </div>
              </div>
            )}
          </ShareLinkForm>
        </DialogContent>
      </Dialog>
    );
  }

  return null;
}
