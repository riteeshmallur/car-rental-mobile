import { create } from 'zustand';

type LoadingState = {
  pendingCount: number;
  isLoading: boolean;
  startLoading: () => void;
  stopLoading: () => void;
};

export const useLoadingStore = create<LoadingState>((set) => ({
  pendingCount: 0,
  isLoading: false,
  startLoading: () =>
    set((state) => ({
      pendingCount: state.pendingCount + 1,
      isLoading: true,
    })),
  stopLoading: () =>
    set((state) => {
      const pendingCount = Math.max(0, state.pendingCount - 1);

      return {
        pendingCount,
        isLoading: pendingCount > 0,
      };
    }),
}));
