import { createORPCClient } from '@orpc/client';
import { RPCLink } from '@orpc/client/fetch';
import type { ApiClient } from './client';

// The client for React Native / Expo. It imports only the router's types,
// so no server code (postgres, node built-ins) reaches the app bundle.
export interface NativeClientConfig {
  baseUrl: string;
  sourceHeader?: string;
  authToken?: string;
  /** Full Cookie header, as returned by the native auth client. */
  sessionCookie?: string;
  /** Called on each request; wins over `sessionCookie`. */
  cookieGetter?: () => string | undefined;
}

export function createNativeClient(config: NativeClientConfig): ApiClient {
  return createORPCClient(
    new RPCLink({
      headers() {
        const headers: Record<string, string> = {
          'x-orpc-source': config.sourceHeader ?? 'expo',
        };
        if (config.authToken)
          headers.authorization = `Bearer ${config.authToken}`;
        const cookie = config.cookieGetter?.() ?? config.sessionCookie;
        if (cookie) headers.cookie = cookie;
        return headers;
      },
      url: `${config.baseUrl}/api/rpc`,
    }),
  );
}
