import {
  dehydrate,
  HydrationBoundary as ReactQueryHydrationBoundary,
} from '@tanstack/react-query';
import type { PropsWithChildren } from 'react';
import { getQueryClient } from './server';

/**
 * HydrationBoundary for oRPC queries prefetched in server components.
 * Use this to hydrate query data from server to client.
 *
 * @example
 * ```tsx
 * import { HydrationBoundary } from '@seawatts/api/react/hydration-boundary';
 * import { getQueryClient, orpc } from '@seawatts/api/react/server';
 *
 * export default async function Page() {
 *   const queryClient = getQueryClient();
 *   void queryClient.prefetchQuery(orpc.org.current.queryOptions());
 *
 *   return (
 *     <HydrationBoundary>
 *       <ClientComponent />
 *     </HydrationBoundary>
 *   );
 * }
 * ```
 */
export async function HydrationBoundary(props: PropsWithChildren) {
  const queryClient = getQueryClient();
  const dehydratedState = dehydrate(queryClient);

  return (
    <ReactQueryHydrationBoundary state={dehydratedState}>
      {props.children}
    </ReactQueryHydrationBoundary>
  );
}
