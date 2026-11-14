import { createTanstackQueryUtils } from '@orpc/tanstack-query';
import { createNativeClient } from '@seawatts/api/native';
import { QueryClient } from '@tanstack/react-query';

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
 * The typed API client for imperative calls: `await api.org.current()`.
 *
 * Uses cookieGetter for dynamic auth - the cookie is fetched on each request
 * since it may change after OAuth login.
 */
export const api = createNativeClient({
  baseUrl: getApiBaseUrl(),
  cookieGetter: () => authClient.getCookie() ?? undefined,
  sourceHeader: 'expo',
});

/**
 * Query and mutation options for React Query:
 * `useQuery(orpc.org.current.queryOptions())`.
 */
export const orpc = createTanstackQueryUtils(api);
