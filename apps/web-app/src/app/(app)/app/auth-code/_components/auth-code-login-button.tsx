'use client';

import { MetricButton } from '@seawatts/analytics/components';
import { useORPC } from '@seawatts/api/react/react';
import { Icons } from '@seawatts/ui/custom/icons';
import { useMutation } from '@tanstack/react-query';
import posthog from 'posthog-js';
import { useCallback, useState } from 'react';

export function AuthCodeLoginButton({
  disabled,
  loadingText,
  text,
  onSuccess,
}: {
  disabled?: boolean;
  loadingText?: string;
  text?: string;
  onSuccess?: () => void;
}) {
  const [error, setError] = useState<string>();

  const api = useORPC();
  const { mutateAsync: createAuthCode, isPending } = useMutation(
    api.auth.createAuthCode.mutationOptions(),
  );

  const onLogin = useCallback(async () => {
    try {
      setError(undefined);
      posthog.capture('auth_code_login_started');
      const result = await createAuthCode({});

      // Call onSuccess callback if provided
      if (onSuccess) {
        onSuccess();
      }

      const currentUrl = new URL(window.location.href);
      const redirectUri = currentUrl.searchParams.get('redirectTo');
      const source = currentUrl.searchParams.get('source');

      if (source === 'extension' && redirectUri) {
        // Handle VS Code OAuth flow
        const redirectUrl = new URL(redirectUri);
        redirectUrl.searchParams.set('code', result.authCode.id);
        window.location.href = redirectUrl.href;
      } else {
        // Handle CLI flow
        const port = currentUrl.searchParams.get('port');
        const csrfToken = currentUrl.searchParams.get('csrf');
        const redirectUrl = new URL(`http://localhost:${port ?? 54321}`);
        redirectUrl.searchParams.set('code', result.authCode.id);
        redirectUrl.searchParams.set('csrf', csrfToken || '');
        window.location.href = redirectUrl.href;
      }

      posthog.capture('auth_code_login_success', {
        hasCsrfToken: !!currentUrl.searchParams.get('csrf'),
        isVSCode: !!redirectUri,
        port: currentUrl.searchParams.get('port'),
      });
    } catch (error) {
      console.error('Failed to generate token:', error);
      setError('Failed to authenticate. Please try again.');
      posthog?.captureException(error);
    }
  }, [createAuthCode, onSuccess]);

  return (
    <div className="flex flex-col gap-2">
      {!error && (
        <MetricButton
          autoFocus
          disabled={isPending || disabled}
          metric="auth_code_login_grant_access_clicked"
          onClick={onLogin}
        >
          {isPending ? (
            <>
              <Icons.Spinner className="mr-2" size="sm" variant="muted" />
              {loadingText}
            </>
          ) : (
            <>
              {/* <Icons.LogIn className="mr-2" size="sm" /> */}
              {text ?? 'Grant Access'}
            </>
          )}
        </MetricButton>
      )}
      {/* <span className="text-sm text-muted-foreground">
        This will generate a secure token valid for 30 days.
      </span> */}
      {error && (
        <div className="flex flex-col gap-2">
          <MetricButton
            className="w-full"
            metric="auth_code_login_try_again_clicked"
            onClick={onLogin}
            variant="destructive"
          >
            <Icons.ArrowRight className="mr-2" size="sm" />
            Try Again
          </MetricButton>
          <span className="text-sm text-destructive">{error}</span>
        </div>
      )}
      {/* {isPending && (
        <span className="text-sm text-muted-foreground animate-in fade-in">
          You'll be redirected back shortly...
        </span>
      )} */}
      {/* {hasSucceeded && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-sm">
            <Icons.CheckCircle2 size="sm" />
            Login successful!
          </div>
        </div>
      )} */}
    </div>
  );
}
