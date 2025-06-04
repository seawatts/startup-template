import { Button } from '@acme/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@acme/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@acme/ui/drawer';
import { isDesktop } from '@acme/ui/hooks/use-media-query';
import { Icons } from '@acme/ui/icons';

import { useChromePortal } from '~/hooks/use-chrome-portal';
import { SubmitFeedbackForm } from './form';
import type { SubmitFeedbackType } from './types';

type SubmitFeedbackDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  type: SubmitFeedbackType;
  element?: string;
};

export function SubmitFeedbackDialog({
  isOpen,
  onClose,
  type,
  element,
}: SubmitFeedbackDialogProps) {
  const portalElement = useChromePortal();
  const title =
    type === 'feature-request'
      ? 'Feature Suggestion'
      : type === 'feedback'
        ? 'Submit Feedback'
        : 'Report Bug';
  const description =
    type === 'feature-request'
      ? "Spill the tea on what you're craving! We'll slide into your DMs ASAP."
      : "Drop your thoughts, fam! We're all ears for the tea. 👀";

  if (isDesktop()) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent portalContainer={portalElement}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <SubmitFeedbackForm type={type} element={element} onSuccess={onClose}>
            {({ isPending }) => (
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={onClose}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isPending}>
                  {isPending && <Icons.Spinner className="mr-2" />}
                  {isPending ? 'Submitting...' : 'Submit'}
                </Button>
              </div>
            )}
          </SubmitFeedbackForm>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent portalContainer={portalElement}>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <SubmitFeedbackForm type={type} element={element} onSuccess={onClose}>
          {({ isPending }) => (
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Icons.Spinner className="mr-2" />}
                {isPending ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          )}
        </SubmitFeedbackForm>
      </DrawerContent>
    </Drawer>
  );
}
