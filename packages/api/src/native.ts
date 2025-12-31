/**
 * React Native / Expo safe exports
 *
 * This file exports only client-side utilities that don't depend on
 * Node.js-specific modules (like postgres, fs, os, etc.)
 *
 * Use this entry point for mobile apps:
 * import { createNativeClient } from '@seawatts/api/native';
 */

import {
  createTRPCClient,
  httpBatchStreamLink,
  loggerLink,
  type TRPCClient,
} from '@trpc/client';
import type { AnyRouter } from '@trpc/server';
import SuperJSON from 'superjson';

export interface NativeClientConfig {
  baseUrl: string;
  sourceHeader?: string;
  authToken?: string;
  /** Static session cookie value */
  sessionCookie?: string;
  /** Dynamic cookie getter - called on each request (useful for Expo/mobile) */
  cookieGetter?: () => string | undefined;
}

export type NativeApiClient<TRouter extends AnyRouter> = TRPCClient<TRouter>;

/**
 * Create a tRPC client for React Native / Expo apps
 *
 * This is a generic version that doesn't import the router implementation,
 * making it safe to use in React Native where Node.js modules aren't available.
 *
 * @example
 * ```tsx
 * import { createNativeClient } from '@seawatts/api/native';
 * import type { AppRouter } from '@seawatts/api/types';
 *
 * const api = createNativeClient<AppRouter>({
 *   baseUrl: 'https://api.example.com',
 *   cookieGetter: () => authClient.getCookie(),
 * });
 * ```
 */
export function createNativeClient<TRouter extends AnyRouter>(
  config: NativeClientConfig,
): TRPCClient<TRouter> {
  return createTRPCClient<TRouter>({
    links: [
      loggerLink({
        enabled: (op) =>
          process.env.NODE_ENV === 'development' ||
          (op.direction === 'down' && op.result instanceof Error),
      }),
      // Type assertion needed because TRouter is generic and we can't prove
      // SuperJSON matches the router's transformer at compile time
      httpBatchStreamLink<TRouter>({
        headers() {
          const headers = new Headers();
          headers.set('x-trpc-source', config.sourceHeader ?? 'expo');

          if (config.authToken) {
            headers.set('Authorization', `Bearer ${config.authToken}`);
          }

          // Support dynamic cookie getter (for Expo)
          const dynamicCookie = config.cookieGetter?.();
          if (dynamicCookie) {
            headers.set('Cookie', dynamicCookie);
          } else if (config.sessionCookie) {
            headers.set('Cookie', `__session=${config.sessionCookie}`);
          }

          return headers;
        },
        transformer: SuperJSON,
        url: `${config.baseUrl}/api/trpc`,
      } as unknown as Parameters<typeof httpBatchStreamLink<TRouter>>[0]),
    ],
  });
}
