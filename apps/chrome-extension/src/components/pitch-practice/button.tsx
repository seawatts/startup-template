import logoIcon from 'data-base64:~/../assets/icon.png';
import { Button } from '@acme/ui/button';
import { useState } from 'react';

import { PitchPracticeDialog } from './dialog';

export function PitchPracticeButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button
        className="flex w-full items-center"
        onClick={() => setIsDialogOpen(true)}
      >
        <img alt="Acme" className="mb-0.5 mr-2 size-5" src={logoIcon} />
        Pitch Practice
      </Button>
      <PitchPracticeDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}
