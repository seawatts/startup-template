import { Button } from '@seawatts/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@seawatts/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@seawatts/ui/drawer';
import { isDesktop } from '@seawatts/ui/hooks/use-media-query';
import { Icons } from '@seawatts/ui/icons';

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
      <Dialog onOpenChange={onClose} open={isOpen}>
        <DialogContent portalContainer={portalElement}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
          <SubmitFeedbackForm element={element} onSuccess={onClose} type={type}>
            {({ isPending }) => (
              <div className="flex justify-end gap-2">
                <Button onClick={onClose} variant="outline">
                  Cancel
                </Button>
                <Button disabled={isPending} type="submit">
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
    <Drawer onOpenChange={onClose} open={isOpen}>
      <DrawerContent portalContainer={portalElement}>
        <DrawerHeader>
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>{description}</DrawerDescription>
        </DrawerHeader>
        <SubmitFeedbackForm element={element} onSuccess={onClose} type={type}>
          {({ isPending }) => (
            <div className="flex justify-end gap-2">
              <Button onClick={onClose} variant="outline">
                Cancel
              </Button>
              <Button disabled={isPending} type="submit">
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
