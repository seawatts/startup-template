import type { AppRouter } from '@seawatts/api';
import { QueryClient } from '@tanstack/react-query';
import { createTRPCClient, httpBatchLink, loggerLink } from '@trpc/client';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';
import superjson from 'superjson';

import { authClient } from './auth';
import { getApiBaseUrl } from './base-url';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Configure default query options here
    },
  },
});

/**
 * A set of typesafe hooks for consuming your API.
 */
export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: createTRPCClient({
    links: [
      loggerLink({
        colorMode: 'ansi',
        enabled: (opts) =>
          process.env.NODE_ENV === 'development' ||
          (opts.direction === 'down' && opts.result instanceof Error),
      }),
      httpBatchLink({
        headers() {
          const headers = new Map<string, string>();
          headers.set('x-trpc-source', 'expo-react');

          const cookies = authClient.getCookie();
          if (cookies) {
            headers.set('Cookie', cookies);
          }
          return headers;
        },
        transformer: superjson,
        url: `${getApiBaseUrl()}/api/trpc`,
      }),
    ],
  }),
  queryClient,
});

export type { RouterInputs, RouterOutputs } from '@seawatts/api';
