import logoIcon from 'data-base64:~/../assets/icon.png';
import { Button } from '@acme/ui/button';
import { SignedIn, useUser } from '@clerk/chrome-extension';
import { useState } from 'react';

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
      <Button className={className} onClick={handleClick} type="button">
        {(withIcon ?? true) && (
          <img alt="Acme" className="mb-0.5 mr-2 size-5" src={logoIcon} />
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
