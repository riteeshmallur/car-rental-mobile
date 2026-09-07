import { useLoadingStore } from '@/store/loading-store';

export function useGlobalLoading() {
  const startLoading = useLoadingStore((state) => state.startLoading);
  const stopLoading = useLoadingStore((state) => state.stopLoading);
  const isLoading = useLoadingStore((state) => state.isLoading);

  return {
    isLoading,
    startLoading,
    stopLoading,
  };
}
