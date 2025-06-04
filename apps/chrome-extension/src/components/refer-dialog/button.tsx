import { useUser } from '@clerk/chrome-extension';
import { useState } from 'react';

export function ReferDialogButton() {
  const user = useUser();
  const [_isDialogOpen, setIsDialogOpen] = useState(false);

  const handleSignIn = async () => {
    const _redirectUrl = encodeURIComponent(globalThis.location.href);
  };

  const _handleClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.preventDefault();
    event.stopPropagation();
    if (user.isSignedIn) {
      setIsDialogOpen(true);
    } else {
      handleSignIn();
    }
  };

  return null;
  // return (
  //   <>
  //     <Button onClick={handleClick} type="button" variant="outline">
  //       <Icons.Gift className="mr-2" />
  //       {children || "Refer for 100% off"}
  //     </Button>
  //     <SignedIn>
  //       <ReferDialog
  //         isOpen={isDialogOpen}
  //         onClose={() => setIsDialogOpen(false)}
  //       />
  //     </SignedIn>
  //   </>
  // );
}
