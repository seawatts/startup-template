/* eslint-disable unicorn/prefer-ternary */

import { useAuth } from '@clerk/chrome-extension';
import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { loggerLink, unstable_httpBatchStreamLink } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { useState } from 'react';
import SuperJSON from 'superjson';

import type { AppRouter } from '@acme/api';

import { env } from '../env.chrome';
import { createQueryClient } from './query-client';

let clientQueryClientSingleton: QueryClient | undefined = undefined;
const getQueryClient = () => {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return createQueryClient();
  }
  // Browser: use singleton pattern to keep the same query client
  if (!clientQueryClientSingleton) {
    clientQueryClientSingleton = createQueryClient();
  }
  return clientQueryClientSingleton;
};

export const api: ReturnType<typeof createTRPCReact<AppRouter>> =
  createTRPCReact<AppRouter>();

export function TRPCReactProvider(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  const { getToken } = useAuth();

  const [trpcClient] = useState(() =>
    api.createClient({
      links: [
        loggerLink({
          enabled: (op) =>
            env.PLASMO_PUBLIC_NODE_ENV === 'development' ||
            (op.direction === 'down' && op.result instanceof Error),
        }),
        unstable_httpBatchStreamLink({
          async headers() {
            const headers = new Headers();
            const authToken = await getToken();
            if (authToken) {
              headers.set('Authorization', authToken);
            }
            headers.set('x-trpc-source', 'chrome-extension-react');

            return headers;
          },
          transformer: SuperJSON,
          url: `${getBaseUrl()}/api/trpc`,
        }),
      ],
    }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <api.Provider client={trpcClient} queryClient={queryClient}>
        {props.children}
      </api.Provider>
    </QueryClientProvider>
  );
}
const getBaseUrl = () => {
  // console.log('apiurl', env.PLASMO_PUBLIC_API_URL);
  // if (typeof window !== "undefined") return window.location.origin;
  if (env.PLASMO_PUBLIC_API_URL) return env.PLASMO_PUBLIC_API_URL;

  return `http://localhost:${process.env.PORT ?? 3000}`;
};
