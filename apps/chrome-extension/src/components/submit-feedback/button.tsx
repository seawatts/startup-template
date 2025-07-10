import logoIcon from 'data-base64:~/../assets/icon.png';
import { Button } from '@acme/ui/button';
import { SignedIn } from '@clerk/chrome-extension';
import { useState } from 'react';

import { SubmitFeedbackDialog } from './dialog';
import type { SubmitFeedbackType } from './types';

interface SubmitFeedbackButtonProps {
  children?: React.ReactNode;
  className?: string;
  type: SubmitFeedbackType;
  element?: string;
}

export function SubmitFeedbackButton({
  children,
  className,
  type,
  element,
}: SubmitFeedbackButtonProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  let buttonText = 'Submit Feedback';
  if (type === 'feature-request') {
    buttonText = 'Suggest Feature';
  }
  if (type === 'feedback') {
    buttonText = 'Submit Feedback';
  }
  if (type === 'bug-report') {
    buttonText = 'Report Bug';
  }

  return (
    <>
      <Button
        className={className}
        onClick={() => setIsDialogOpen(true)}
        type="button"
        variant="outline"
      >
        <img alt="Acme" className="mb-0.5 mr-2 size-5" src={logoIcon} />
        {children || buttonText}
      </Button>
      <SignedIn>
        <SubmitFeedbackDialog
          element={element}
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          type={type}
        />
      </SignedIn>
    </>
  );
}
