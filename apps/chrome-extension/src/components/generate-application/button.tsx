import logoIcon from 'data-base64:~/../assets/icon.png';
import { Button } from '@acme/ui/button';
import { useState } from 'react';

import { useCompany } from '../company/context';
import { GenerateApplicationDialog } from './dialog';

export function GenerateApplicationButton() {
  const { hasCompany } = useCompany();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const isDisabled = !hasCompany;

  const handleClick = () => {
    setIsDialogOpen(true);
  };

  return (
    <>
      <Button
        className="flex w-full items-center"
        disabled={isDisabled}
        onClick={handleClick}
      >
        <img alt="Acme" className="mb-0.5 mr-2 size-5" src={logoIcon} />
        Auto-fill
      </Button>
      <GenerateApplicationDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
      />
    </>
  );
}
