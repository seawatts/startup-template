'use client';

import { ORPCError } from '@orpc/client';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';
import { QueryClientProvider } from '@tanstack/react-query';
import { createContext, type ReactNode, useContext, useState } from 'react';
import { type ApiClient, createClient } from '../client';
import type { ClientConfig } from './config';
import { createQueryClient } from './query-client';

const createUtils = (client: ApiClient) => createTanstackQueryUtils(client);
const Context = createContext<ReturnType<typeof createUtils> | null>(null);

/**
 * The typed API for client components.
 *
 * @example
 * ```tsx
 * const api = useORPC();
 * const org = useQuery(api.org.current.queryOptions());
 * const rename = useMutation(api.org.update.mutationOptions());
 * queryClient.invalidateQueries({ queryKey: api.org.current.key() });
 * ```
 */
export function useORPC() {
  const client = useContext(Context);
  if (!client) throw new Error('useORPC requires ORPCReactProvider');
  return client;
}

export function ORPCReactProvider({
  children,
  ...config
}: { children: ReactNode } & ClientConfig) {
  const [queryClient] = useState(createQueryClient);
  const [client] = useState(() =>
    createUtils(
      createClient({
        ...config,
        sourceHeader: config.sourceHeader ?? 'nextjs-react',
      }),
    ),
  );
  return (
    <QueryClientProvider client={queryClient}>
      <Context.Provider value={client}>{children}</Context.Provider>
    </QueryClientProvider>
  );
}

export const getErrorCode = (error: unknown) =>
  error instanceof ORPCError ? error.code : undefined;
