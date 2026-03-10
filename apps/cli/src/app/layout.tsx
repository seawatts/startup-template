import { TRPCReactProvider } from '@seawatts/api/react';

import { debug } from '@seawatts/logger';
import { Box, Text } from 'ink';
import { type FC, useEffect, useRef } from 'react';
import { ErrorBoundary, type FallbackProps } from 'react-error-boundary';
import { Ascii } from '~/components/ascii';
import { Router } from '~/components/router';
import { AuthProvider } from '~/context/auth-context';
import { RouterProvider } from '~/context/router-context';
import { SignedIn } from '~/guards';
import { useDimensions } from '~/hooks/use-dimensions';
import {
  capture,
  captureException,
  PostHogIdentifyUser,
  PostHogOptIn,
  PostHogPageView,
} from '~/lib/posthog';
import { useAuthStore } from '~/stores/auth-store';
import { useCliStore } from '~/stores/cli-store';
import { useRouterStore } from '~/stores/router-store';

const log = debug('seawatts:cli:layout');

function ErrorFallback({ error }: FallbackProps) {
  const err = error instanceof Error ? error : new Error(String(error));
  log('An error occurred:', err);
  captureException(err);

  return (
    <Box>
      <Text color="red">Error</Text>
      <Text color="red">{err.message}</Text>
    </Box>
  );
}

function AppContent() {
  const dimensions = useDimensions();
  const isValidating = useAuthStore.use.isValidatingSession();
  const navigate = useRouterStore.use.navigate();
  const command = useCliStore.use.command?.();
  const currentPath = useRouterStore.use.currentPath();
  const hasNavigatedToCommand = useRef(false);

  useEffect(() => {
    capture({
      event: 'dimensions_changed',
      properties: {
        height: dimensions.height,
        width: dimensions.width,
      },
    });
  }, [dimensions]);

  if (isValidating) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box marginBottom={1}>
          <Ascii
            color="gray"
            font="ANSI Shadow"
            text="Seawatts"
            width={dimensions.width}
          />
        </Box>
        <Text>Validating session...</Text>
      </Box>
    );
  }

  if (
    command &&
    currentPath !== command &&
    currentPath !== '/login' &&
    !hasNavigatedToCommand.current
  ) {
    log('Navigating to command:', command);
    hasNavigatedToCommand.current = true;
    navigate(command, { resetHistory: true });
  }

  return (
    <Box
      flexDirection="column"
      minHeight={dimensions.height}
      // HACK to fix flickering https://github.com/vadimdemedes/ink/issues/450#issuecomment-1836274483
      padding={1}
    >
      <SignedIn>
        <Text>You are not authorized to use this webhook.</Text>
      </SignedIn>
      <Router />
    </Box>
  );
}

export const Layout: FC = () => {
  return (
    <PostHogOptIn enableTelemetry={true}>
      <ErrorBoundary FallbackComponent={ErrorFallback}>
        <AuthProvider>
          <RouterProvider>
            <PostHogPageView />
            <PostHogIdentifyUser />
            <TRPCReactProvider sourceHeader="cli">
              <AppContent />
            </TRPCReactProvider>
          </RouterProvider>
        </AuthProvider>
      </ErrorBoundary>
    </PostHogOptIn>
  );
};
