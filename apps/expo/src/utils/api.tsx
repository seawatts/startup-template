import { createNativeClient, type NativeApiClient } from '@seawatts/api/native';
import { QueryClient } from '@tanstack/react-query';
import type { AnyRouter } from '@trpc/server';
import { createTRPCOptionsProxy } from '@trpc/tanstack-react-query';

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
 * AppRouter type placeholder for Expo
 *
 * This uses AnyRouter to avoid importing the actual router implementation
 * which would pull in Node.js-only dependencies (postgres, fs, os, etc.)
 *
 * Type safety is maintained through the server's API contract.
 * For full type inference, ensure your API endpoints are well-typed on the server.
 */
type AppRouter = AnyRouter;

/**
 * Vanilla tRPC client for imperative calls (non-React context).
 * Use this for mutations outside of React components.
 *
 * Uses cookieGetter for dynamic auth - the cookie is fetched on each request
 * since it may change after OAuth login.
 */
export const api: NativeApiClient<AppRouter> = createNativeClient<AppRouter>({
  baseUrl: getApiBaseUrl(),
  cookieGetter: () => authClient.getCookie() ?? undefined,
  sourceHeader: 'expo',
});

/**
 * A set of typesafe hooks for consuming your API.
 */
export const trpc = createTRPCOptionsProxy<AppRouter>({
  client: api,
  queryClient,
});
