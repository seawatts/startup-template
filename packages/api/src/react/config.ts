import { RPCLink } from '@orpc/client/fetch';
import { BatchLinkPlugin } from '@orpc/client/plugins';
import { TANSTACK_QUERY_OPERATION_CONTEXT_SYMBOL } from '@orpc/tanstack-query';
import { env } from '../env';

export const getBaseUrl = (baseUrl?: string) => {
  if (baseUrl) return baseUrl;
  const location = (globalThis as { location?: { origin?: string } }).location;
  if (location?.origin) return location.origin;
  if (env.NEXT_PUBLIC_APP_URL) return env.NEXT_PUBLIC_APP_URL;
  if (env.VERCEL_URL) return `https://${env.VERCEL_URL}`;
  return `http://localhost:${process.env.PORT ?? 3000}`;
};

export type ClientConfig = {
  sourceHeader?: string;
  authToken?: string;
  /** Full Cookie header, as returned by a native auth client. */
  sessionCookie?: string;
  /** Called on each request; wins over `sessionCookie`. */
  cookieGetter?: () => string | undefined;
  baseUrl?: string;
};

export const createDefaultLink = (config: ClientConfig = {}) =>
  new RPCLink({
    headers() {
      const headers = new Headers({
        'x-orpc-source': config.sourceHeader ?? 'vanilla',
      });
      if (config.authToken)
        headers.set('Authorization', `Bearer ${config.authToken}`);
      const cookie = config.cookieGetter?.() ?? config.sessionCookie;
      if (cookie) headers.set('Cookie', cookie);
      return headers;
    },
    // A read (a TanStack query) is a GET, so the server can tell reads from
    // writes by method; the route refuses a GET for a procedure that isn't
    // marked `.route({ method: 'GET' })`.
    method: ({ context }) =>
      context[TANSTACK_QUERY_OPERATION_CONTEXT_SYMBOL]?.type === 'query'
        ? 'GET'
        : 'POST',
    plugins: batchRequests()
      ? [
          new BatchLinkPlugin({
            groups: [{ condition: () => true, context: {} }],
            maxSize: 20,
            maxUrlLength: 6000,
            url: `${getBaseUrl(config.baseUrl)}/api/rpc/__batch__`,
          }),
        ]
      : [],
    url: `${getBaseUrl(config.baseUrl)}/api/rpc`,
  });

// A screen's reads go out as one request. Sent one by one, the reads a page
// makes on arrival each start their own server function, and when those are
// cold every read waits for one; one request also checks the session once
// instead of once per read. Answers still stream back as each read finishes.
// Browser tests hold, fail or watch single procedures by their own address,
// so an automated browser keeps one request per procedure.
const batchRequests = () => {
  const browser = globalThis as {
    document?: unknown;
    navigator?: { webdriver?: boolean };
  };
  return !!browser.document && !browser.navigator?.webdriver;
};
