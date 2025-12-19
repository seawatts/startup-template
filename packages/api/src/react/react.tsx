'use client';

import type { QueryClient } from '@tanstack/react-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { createTRPCClient } from '@trpc/client';
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
 * tRPC v11 TanStack React Query integration
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

export function TRPCReactProvider(
  props: {
    children: React.ReactNode;
  } & ClientConfig,
) {
  const queryClient = getQueryClient();

  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links: createDefaultLinks({
        authToken: props.authToken,
        sourceHeader: props.sourceHeader ?? 'nextjs-react',
      }),
    }),
  );

  return (
    <TRPCProvider queryClient={queryClient} trpcClient={trpcClient}>
      <QueryClientProvider client={queryClient}>
        {props.children}
      </QueryClientProvider>
    </TRPCProvider>
  );
}
