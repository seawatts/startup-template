import {
  defaultShouldDehydrateQuery,
  QueryClient,
} from '@tanstack/react-query';
import SuperJSON from 'superjson';

// A 4xx answer (not found, not allowed, bad input) is the same on every
// try, so it isn't retried: the page shows its error state at once instead
// of a skeleton for seconds. A timeout or rate limit is retried.
const isFinalClientError = (error: unknown) => {
  const status =
    error && typeof error === 'object' && 'status' in error
      ? Number(error.status)
      : 0;
  return status >= 400 && status < 500 && status !== 408 && status !== 429;
};

export const createQueryClient = () =>
  new QueryClient({
    defaultOptions: {
      dehydrate: {
        serializeData: SuperJSON.serialize,
        shouldDehydrateQuery: (query) =>
          defaultShouldDehydrateQuery(query) ||
          query.state.status === 'pending',
      },
      hydrate: {
        deserializeData: SuperJSON.deserialize,
      },
      queries: {
        retry: (failures, error) => failures < 3 && !isFinalClientError(error),
        // With SSR, we usually want to set some default staleTime
        // above 0 to avoid refetching immediately on the client
        staleTime: 30 * 1000,
      },
    },
  });
