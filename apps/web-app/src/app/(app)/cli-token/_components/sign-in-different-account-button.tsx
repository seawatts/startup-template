'use client';

import { Button } from '@acme/ui/button';
import { useClerk } from '@clerk/nextjs';
import { useSearchParams } from 'next/navigation';

export function SignInDifferentAccountButton() {
  const { signOut } = useClerk();
  const searchParams = useSearchParams();
  const currentQueryString = searchParams.toString();
  const redirectUrl = `/cli-token${
    currentQueryString ? `?${currentQueryString}` : ''
  }`;

  return (
    <Button
      className="w-fit"
      onClick={() =>
        signOut({
          redirectUrl,
        })
      }
      variant="link"
    >
      Sign in with different account
    </Button>
  );
}
