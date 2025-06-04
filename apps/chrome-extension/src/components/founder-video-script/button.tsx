import logoIcon from 'data-base64:~/../assets/icon.png';
import { useState } from 'react';

import { Button } from '@acme/ui/button';

import { useCompany } from '../company/context';
import { ScriptDialog } from './dialog';

export function ScriptButton() {
  const { hasCompany } = useCompany();

  const isDisabled = !hasCompany;

  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <>
      <Button
        className="flex w-full items-center"
        onClick={() => setIsDialogOpen(true)}
        disabled={isDisabled}
      >
        <img src={logoIcon} alt="Acme" className="mb-0.5 mr-2 size-5" />
        Generate Script
      </Button>
      <ScriptDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}
