import { ClerkProvider } from '@clerk/chrome-extension';
import type { PropsWithChildren } from 'react';

import {
  PostHogIdentifyUser,
  PostHogPageView,
} from '@acme/analytics/posthog/chrome-extension';
import { TRPCReactProvider } from '@acme/api/chrome-extension';

import { SentryIdentifyUser } from '~/utils/sentry';
import { CompanyProvider } from './components/company/context';
import { DocumentProvider } from './components/document/context';
import { ErrorBoundary } from './components/error-boundary';
import { env } from './env';

export function Providers({ children }: PropsWithChildren) {
  return (
    <ErrorBoundary>
      <ClerkProvider
        publishableKey={env.PLASMO_PUBLIC_CLERK_PUBLISHABLE_KEY}
        syncSessionWithTab
        polling
      >
        <ProvidersWithUser>{children}</ProvidersWithUser>
      </ClerkProvider>
    </ErrorBoundary>
  );
}

function ProvidersWithUser({ children }: PropsWithChildren) {
  return (
    <>
      <SentryIdentifyUser />
      <PostHogIdentifyUser />
      <PostHogPageView />
      <TRPCReactProvider>
        <CompanyProvider>
          <DocumentProvider>{children}</DocumentProvider>
        </CompanyProvider>
      </TRPCReactProvider>
    </>
  );
}
