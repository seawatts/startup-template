import { useCallback, useState } from 'react';

import { fetchAndStream } from '~/utils/fetch-stream';

// Modified useAIStream hook
export function useAIStream<T>() {
  const [isLoading, setIsLoading] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const [isError, setIsError] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [partialData, setPartialData] = useState<T | undefined>(undefined);
  const [streamResult, setStreamResult] = useState<T | undefined>(undefined);

  const mutate = useCallback(
    async (apiEndpoint: string, payload: object): Promise<T | undefined> => {
      setIsLoading(true);
      setIsError(false);
      setError(null);
      setIsComplete(false);
      setPartialData(undefined);
      setStreamResult(undefined);

      try {
        const result = await fetchAndStream<T>(apiEndpoint, payload, (data) => {
          setPartialData(data);
        });

        setStreamResult(result);
        setIsComplete(true);
        return result;
      } catch (error) {
        setIsError(true);
        setError(
          error instanceof Error
            ? error
            : new Error('An unknown error occurred'),
        );
        return undefined;
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  return {
    data: streamResult,
    error,
    isComplete,
    isError,
    isLoading,
    mutate,
    partialData,
  };
}
