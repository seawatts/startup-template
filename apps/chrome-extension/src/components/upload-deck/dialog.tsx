import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@acme/ui/alert-dialog';
import { Button } from '@acme/ui/button';
import { Icons } from '@acme/ui/icons';

import { useChromePortal } from '~/hooks/use-chrome-portal';
import { Entitled } from '../entitlement/entitled';
import { NotEntitled } from '../entitlement/not-entitled';
import { StripeCheckoutButton } from '../stripe-checkout/button';
import { UploadPitchDeckForm } from './form';

interface UploadPitchDeckDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function UploadPitchDeckDialog({
  isOpen,
  onClose,
}: UploadPitchDeckDialogProps) {
  const portalElement = useChromePortal();

  return (
    <AlertDialog open={isOpen} onOpenChange={onClose}>
      <AlertDialogContent portalContainer={portalElement}>
        <AlertDialogHeader>
          <AlertDialogTitle>Upload Pitch Deck</AlertDialogTitle>
          <AlertDialogDescription>
            We will use the information from your pitch deck to generate a
            comprehensive application.
          </AlertDialogDescription>
        </AlertDialogHeader>

        <UploadPitchDeckForm onSuccess={onClose}>
          {({ isPending }) => (
            <AlertDialogFooter>
              <Button variant="outline" onClick={onClose} type="button">
                Cancel
              </Button>
              <Entitled entitlement="pitch_deck_upload">
                <Button type="submit" disabled={isPending}>
                  {isPending && <Icons.Spinner className="mr-2" />}
                  {isPending ? 'Uploading...' : 'Upload'}
                </Button>
              </Entitled>
              <NotEntitled entitlement="pitch_deck_upload">
                <StripeCheckoutButton withIcon={false} />
              </NotEntitled>
            </AlertDialogFooter>
          )}
        </UploadPitchDeckForm>
      </AlertDialogContent>
    </AlertDialog>
  );
}
