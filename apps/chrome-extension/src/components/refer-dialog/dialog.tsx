import { Button } from '@acme/ui/button';
import { CopyButton } from '@acme/ui/copy-button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@acme/ui/dialog';
import {
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@acme/ui/drawer';
import { isDesktop } from '@acme/ui/hooks/use-media-query';
import { Icons } from '@acme/ui/icons';

import { useChromePortal } from '~/hooks/use-chrome-portal';
import { ReferForm } from './form';

type ReferDialogProps = {
  isOpen: boolean;
  onClose: () => void;
};

export function ReferDialog({ isOpen, onClose }: ReferDialogProps) {
  const portalElement = useChromePortal();

  // Replace this with the actual referral link generation logic
  const referralLink = 'https://yc-vibe-check.com/refer?code=ABC123';

  const footerContent = ({ isPending }: { isPending: boolean }) => (
    <div className="flex w-full justify-between">
      <CopyButton text={referralLink} variant="outline" size="default">
        Copy Referral Link
      </CopyButton>

      <div className="flex gap-2">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button type="submit" disabled={isPending}>
          {isPending && <Icons.Spinner className="mr-2 h-4 w-4" />}
          {isPending ? 'Sending...' : 'Send Referral'}
        </Button>
      </div>
    </div>
  );

  if (isDesktop()) {
    return (
      <Dialog open={isOpen} onOpenChange={onClose}>
        <DialogContent portalContainer={portalElement}>
          <DialogHeader>
            <DialogTitle>Refer to YC vibe-check 💜</DialogTitle>
            <DialogDescription>
              Get $5 for you and every founder who signs up. Up to 100% off your
              bill!
            </DialogDescription>
          </DialogHeader>
          <ReferForm>
            {({ isPending }) => (
              <DialogFooter className="w-full">
                {footerContent({ isPending })}
              </DialogFooter>
            )}
          </ReferForm>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Drawer open={isOpen} onOpenChange={onClose}>
      <DrawerContent portalContainer={portalElement}>
        <DrawerHeader>
          <DrawerTitle>Refer to YC vibe-check 💜</DrawerTitle>
          <DrawerDescription>
            Get $5 for every founder who signs up. Up to 100% off your bill!{' '}
          </DrawerDescription>
        </DrawerHeader>
        <ReferForm>
          {({ isPending }) => (
            <DrawerFooter className="w-full">
              {footerContent({ isPending })}
            </DrawerFooter>
          )}
        </ReferForm>
      </DrawerContent>
    </Drawer>
  );
}
