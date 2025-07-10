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

import { useChromePortal } from '~/hooks/use-chrome-portal';
import { CouponDiscountAlert } from '../coupon-discount-alert';
import { PricingCards } from './pricing-cards';

interface StripeCheckoutDialogProps {
  isOpen: boolean;
  onClose: () => void;
}

interface StripeCheckoutDialogComponentProps extends StripeCheckoutDialogProps {
  portalElement: HTMLElement | null;
}

export function StripeCheckoutDialog(props: StripeCheckoutDialogProps) {
  const portalElement = useChromePortal();

  const DialogComponent = isDesktop() ? DesktopDialog : MobileDrawer;

  return (
    <DialogComponent
      isOpen={props.isOpen}
      onClose={props.onClose}
      portalElement={portalElement}
    />
  );
}

function DesktopDialog({
  isOpen,
  onClose,
  portalElement,
}: StripeCheckoutDialogComponentProps) {
  return (
    <Dialog onOpenChange={onClose} open={isOpen}>
      <DialogContent className="max-w-5xl" portalContainer={portalElement}>
        <DialogHeader>
          <DialogTitle>Pick Your Vibe</DialogTitle>
          <DialogDescription>
            Check out our plans and pick the one that hits different for you.
          </DialogDescription>
        </DialogHeader>
        <CouponDiscountAlert withCheckoutButton={false} />
        <PricingCards />
      </DialogContent>
    </Dialog>
  );
}

function MobileDrawer({
  isOpen,
  onClose,
  portalElement,
}: StripeCheckoutDialogComponentProps) {
  return (
    <Drawer onOpenChange={onClose} open={isOpen}>
      <DrawerContent className="max-h-[90vh]" portalContainer={portalElement}>
        <DrawerHeader>
          <DrawerTitle>Pick Your Vibe</DrawerTitle>
          <DrawerDescription>
            Check out our plans and pick the one that hits different for you.
          </DrawerDescription>
          <CouponDiscountAlert withCheckoutButton={false} />
        </DrawerHeader>
        <div className="overflow-y-auto px-4">
          <PricingCards />
        </div>
      </DrawerContent>
    </Drawer>
  );
}
