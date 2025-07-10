'use client';
import { Button } from '@acme/ui/components/button';

export function CloseWindowButton() {
  return (
    <Button autoFocus onClick={() => window.close()}>
      Close
    </Button>
  );
}
