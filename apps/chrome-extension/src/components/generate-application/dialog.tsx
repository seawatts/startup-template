import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@acme/ui/alert-dialog';
import { Button } from '@acme/ui/button';

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
    <AlertDialog open={isOpen} onOpenChange={onClose}>
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
              <Button variant="outline" onClick={onClose} type="button">
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending ? 'Filling...' : 'Auto-fill'}
              </Button>
            </AlertDialogFooter>
          )}
        </GenerateApplicationForm>
      </AlertDialogContent>
    </AlertDialog>
  );
}
