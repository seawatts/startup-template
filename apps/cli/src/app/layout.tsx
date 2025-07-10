import { TRPCReactProvider } from '@acme/api/react';

import { debug } from '@acme/logger';
import { Box, Text } from 'ink';
import { type FC, useEffect, useRef } from 'react';
import { ErrorBoundary } from 'react-error-boundary';
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

const log = debug('acme:cli:layout');

function ErrorFallback({ error }: { error: Error }) {
  // Call resetErrorBoundary() to reset the error boundary and retry the render.
  log('An error occurred:', error);
  captureException(error);

  return (
    <Box>
      <Text color="red">Error</Text>
      <Text color="red">{error.message}</Text>
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
            text="Acme"
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
