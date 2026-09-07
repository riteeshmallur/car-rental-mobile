import { create } from 'zustand';

import { type AppError } from '@/types/api';

type ErrorState = {
  currentError: AppError | null;
  setError: (error: AppError) => void;
  clearError: () => void;
};

export const useErrorStore = create<ErrorState>((set) => ({
  currentError: null,
  setError: (error) => set({ currentError: error }),
  clearError: () => set({ currentError: null }),
}));
