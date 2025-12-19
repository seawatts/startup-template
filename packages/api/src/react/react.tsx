'use client';

import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient } from '@trpc/client';
import { createTRPCReact } from '@trpc/react-query';
import { createTRPCContext } from '@trpc/tanstack-react-query';
import { useState } from 'react';

import type { AppRouter } from '../root';
import { type ClientConfig, createDefaultLinks } from './config';
import { createQueryClient } from './query-client';

let clientQueryClientSingleton: QueryClient | undefined;
const getQueryClient = () => {
  if (typeof globalThis === 'undefined') {
    // Server: always make a new query client
    return createQueryClient();
  }

  // Browser: use singleton pattern to keep the same query client
  if (!clientQueryClientSingleton) {
    clientQueryClientSingleton = createQueryClient();
  }
  return clientQueryClientSingleton;
};

/**
 * NEW tRPC v11 pattern - use with TanStack React Query hooks directly
 *
 * @example
 * ```tsx
 * import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
 * import { useTRPC } from '@seawatts/api/react';
 *
 * function Component() {
 *   const trpc = useTRPC();
 *   const queryClient = useQueryClient();
 *
 *   // Queries
 *   const query = useQuery(trpc.greeting.queryOptions({ name: 'World' }));
 *
 *   // Mutations
 *   const mutation = useMutation(trpc.createUser.mutationOptions());
 *
 *   // Invalidation
 *   const invalidate = () => queryClient.invalidateQueries(trpc.greeting.queryFilter());
 * }
 * ```
 */
export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>();

/**
 * LEGACY tRPC pattern - classic React hooks
 * @deprecated Use `useTRPC` with TanStack React Query hooks instead.
 *
 * Migration guide: https://trpc.io/docs/client/tanstack-react-query/migrating
 *
 * @example
 * ```tsx
 * // OLD (deprecated)
 * const query = api.greeting.useQuery({ name: 'World' });
 * const utils = api.useUtils();
 *
 * // NEW (recommended)
 * const trpc = useTRPC();
 * const query = useQuery(trpc.greeting.queryOptions({ name: 'World' }));
 * const queryClient = useQueryClient();
 * queryClient.invalidateQueries(trpc.greeting.queryFilter());
 * ```
 */
export const api = createTRPCReact<AppRouter>();

export function TRPCReactProvider(
  props: {
    children: React.ReactNode;
  } & ClientConfig,
) {
  const queryClient = getQueryClient();

  // Create the new tRPC client for the new pattern
  const [newTrpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: createDefaultLinks({
        authToken: props.authToken,
        sourceHeader: props.sourceHeader ?? 'nextjs-react',
      }),
    }),
  );

  // Create the legacy tRPC client for backwards compatibility
  const [legacyTrpcClient] = useState(() =>
    api.createClient({
      links: createDefaultLinks({
        authToken: props.authToken,
        sourceHeader: props.sourceHeader ?? 'nextjs-react',
      }),
    }),
  );

  return (
    <TRPCProvider queryClient={queryClient} trpcClient={newTrpcClient}>
      <QueryClientProvider client={queryClient}>
        <api.Provider client={legacyTrpcClient} queryClient={queryClient}>
          {props.children}
        </api.Provider>
      </QueryClientProvider>
    </TRPCProvider>
  );
}
