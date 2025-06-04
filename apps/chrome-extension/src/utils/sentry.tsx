import { useUser } from '@clerk/chrome-extension';
import {
  BrowserClient,
  Scope,
  defaultStackParser,
  getDefaultIntegrations,
  makeFetchTransport,
} from '@sentry/browser';
import { useEffect } from 'react';

import { env } from '~/env';

// Filter out integrations that use window global
const filteredIntegrations = getDefaultIntegrations({}).filter(
  (integration) =>
    !['BrowserApiErrors', 'Breadcrumbs', 'GlobalHandlers'].includes(
      integration.name,
    ),
);
const client = new BrowserClient({
  debug: env.NODE_ENV !== 'production',
  dsn: env.PLASMO_PUBLIC_SENTRY_DSN,
  // Only capture errors in production
  enabled: env.NODE_ENV === 'production',
  environment: env.NODE_ENV,
  integrations: filteredIntegrations,
  stackParser: defaultStackParser,
  transport: makeFetchTransport,
});

const scope = new Scope();
scope.setClient(client);
client.init();

// Set default tags
scope.setTags({
  environment: env.NODE_ENV,
  platform: 'chrome-extension',
});

export const sentry = {
  captureException: (error: Error) => scope.captureException(error),
  captureMessage: (message: string) => scope.captureMessage(message),
  setTag: (key: string, value: string) => scope.setTag(key, value),
  setUser: (user: { id: string; email?: string }) => scope.setUser(user),
  // Add any other Sentry methods you need
};

export function SentryIdentifyUser() {
  const user = useUser();

  useEffect(() => {
    if (!user.user) return;

    sentry.setUser({
      email: user.user.emailAddresses[0]?.emailAddress,
      id: user.user.id,
    });
  }, [user]);

  return null;
}
