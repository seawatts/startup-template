import 'server-only';

import { createRouterClient } from '@orpc/server';
import { createTanstackQueryUtils } from '@orpc/tanstack-query';
import { cache } from 'react';
import { createORPCContext } from '../context';
import { appRouter } from '../root';
import { createQueryClient } from './query-client';

// One context (one session lookup) and one query client per request.
const createContext = cache(() => createORPCContext());
export const getQueryClient = cache(createQueryClient);

/**
 * The API for server components: calls procedures in process and fills the
 * query client that HydrationBoundary hands to the browser.
 *
 * @example
 * ```tsx
 * void getQueryClient().prefetchQuery(orpc.org.current.queryOptions());
 * ```
 */
export const orpc = createTanstackQueryUtils(
  createRouterClient(appRouter, { context: createContext }),
);
