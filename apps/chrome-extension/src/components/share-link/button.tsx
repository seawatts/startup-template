import logoIcon from 'data-base64:~/../assets/icon.png';
import { useState } from 'react';

import { Button } from '@acme/ui/button';

import { ShareLinkDialog } from './dialog';

export function ShareLinkButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsDialogOpen(true)}
        type="button"
        className="flex w-full items-center"
      >
        <img src={logoIcon} alt="Acme" className="mb-0.5 mr-2 size-5" />
        Share Link
      </Button>
      <ShareLinkDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}
