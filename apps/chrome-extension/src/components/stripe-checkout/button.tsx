import logoIcon from 'data-base64:~/../assets/icon.png';
import { SignedIn, useUser } from '@clerk/chrome-extension';
import { useState } from 'react';

import { Button } from '@acme/ui/button';

// Import the environment variables
import { env } from '~/env';
import { StripeCheckoutDialog } from './dialog';

interface StripeCheckoutButtonProps {
  children?: React.ReactNode;
  withIcon?: boolean;
  className?: string;
}

export function StripeCheckoutButton({
  children,
  withIcon,
  className,
}: StripeCheckoutButtonProps) {
  const user = useUser();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSignIn = () => {
    const redirectUrl = encodeURIComponent(globalThis.location.href);
    const signInUrl = `${env.PLASMO_PUBLIC_API_URL}/chrome-extension/sign-in?redirect_url=${redirectUrl}`;
    window.open(signInUrl, '_blank');
  };

  const handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (user.isSignedIn) {
      setIsDialogOpen(true);
    } else {
      handleSignIn();
    }
  };

  return (
    <>
      <Button onClick={handleClick} type="button" className={className}>
        {(withIcon ?? true) && (
          <img src={logoIcon} alt="Acme" className="mb-0.5 mr-2 size-5" />
        )}
        {children || 'Upgrade Account'}
      </Button>
      <SignedIn>
        <StripeCheckoutDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
        />
      </SignedIn>
    </>
  );
}
