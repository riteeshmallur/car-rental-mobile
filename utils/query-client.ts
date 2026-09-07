import {
  MutationCache,
  QueryCache,
  QueryClient,
} from '@tanstack/react-query';

import { useErrorStore } from '@/store/error-store';
import { normalizeApiError } from '@/utils/errors';

function handleQueryError(error: unknown) {
  useErrorStore.getState().setError(normalizeApiError(error));
}

export const queryClient = new QueryClient({
  queryCache: new QueryCache({
    onError: handleQueryError,
  }),
  mutationCache: new MutationCache({
    onError: handleQueryError,
  }),
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 30_000,
      refetchOnWindowFocus: false,
    },
  },
});
