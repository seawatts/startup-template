'use client';
import { Button } from '@acme/ui/components/button';

export function CloseWindowButton() {
  return (
    <Button onClick={() => window.close()} autoFocus>
      Close
    </Button>
  );
}
