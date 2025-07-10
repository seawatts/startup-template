import logoIcon from 'data-base64:~/../assets/icon.png';
import { Button } from '@acme/ui/button';
import { useState } from 'react';

import { ShareLinkDialog } from './dialog';

export function ShareLinkButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button
        className="flex w-full items-center"
        onClick={() => setIsDialogOpen(true)}
        type="button"
      >
        <img alt="Acme" className="mb-0.5 mr-2 size-5" src={logoIcon} />
        Share Link
      </Button>
      <ShareLinkDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}
