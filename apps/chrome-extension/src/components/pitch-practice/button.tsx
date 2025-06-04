import logoIcon from 'data-base64:~/../assets/icon.png';
import { useState } from 'react';

import { Button } from '@acme/ui/button';

import { PitchPracticeDialog } from './dialog';

export function PitchPracticeButton() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button
        className="flex w-full items-center"
        onClick={() => setIsDialogOpen(true)}
      >
        <img src={logoIcon} alt="Acme" className="mb-0.5 mr-2 size-5" />
        Pitch Practice
      </Button>
      <PitchPracticeDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}
