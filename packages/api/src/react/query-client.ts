import { QueryClient } from '@tanstack/react-query';

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
      queries: {
        retry: (failures, error) => failures < 3 && !isFinalClientError(error),
        // A screen revisited within 30 s shows what it read last time
        // without asking again; a save invalidates what it changed.
        staleTime: 30 * 1000,
      },
    },
  });
