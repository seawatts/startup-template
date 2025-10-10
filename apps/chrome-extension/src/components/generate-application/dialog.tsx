import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@seawatts/ui/alert-dialog';
import { Button } from '@seawatts/ui/button';

import { useChromePortal } from '~/hooks/use-chrome-portal';
import { GenerateApplicationForm } from './form';

interface GenerateApplicationDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

export function GenerateApplicationDialog({
  isOpen,
  onClose,
}: GenerateApplicationDialogProps) {
  const portalElement = useChromePortal();

  return (
    <AlertDialog onOpenChange={onClose} open={isOpen}>
      <AlertDialogContent portalContainer={portalElement}>
        <AlertDialogHeader>
          <AlertDialogTitle>Auto-fill Application</AlertDialogTitle>
          <AlertDialogDescription>
            This will auto-fill the application fields based on your company
            details and existing answers.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <GenerateApplicationForm onSuccess={onClose}>
          {({ isPending }) => (
            <AlertDialogFooter>
              <Button onClick={onClose} type="button" variant="outline">
                Cancel
              </Button>
              <Button disabled={isPending} type="submit">
                {isPending ? 'Filling...' : 'Auto-fill'}
              </Button>
            </AlertDialogFooter>
          )}
        </GenerateApplicationForm>
      </AlertDialogContent>
    </AlertDialog>
  );
}
