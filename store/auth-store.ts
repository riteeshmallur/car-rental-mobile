import { create } from 'zustand';

import { authApi } from '@/features/auth/services/auth-api';
import {
  clearStoredAuthTokens,
  getStoredAuthTokens,
  setStoredAuthTokens,
} from '@/services/storage/secure-token-storage';
import { useErrorStore } from '@/store/error-store';
import { type AuthResponse, type AuthTokens, type SafeUser } from '@/types/auth';
import { queryClient } from '@/utils/query-client';

import { useLoadingStore } from './loading-store';

type AuthStatus = 'bootstrapping' | 'authenticated' | 'unauthenticated';

type AuthState = {
  status: AuthStatus;
  user: SafeUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  bootstrap: () => Promise<void>;
  setSession: (session: AuthResponse) => Promise<void>;
  applyRefreshedSession: (session: AuthResponse) => void;
  setUser: (user: SafeUser) => void;
  clearSession: () => Promise<void>;
  logout: () => Promise<void>;
};

export const useAuthStore = create<AuthState>((set, get) => ({
  status: 'bootstrapping',
  user: null,
  tokens: null,
  isAuthenticated: false,
  async bootstrap() {
    useLoadingStore.getState().startLoading();
    set({ status: 'bootstrapping' });

    try {
      const tokens = await getStoredAuthTokens();

      if (!tokens) {
        set({
          status: 'unauthenticated',
          user: null,
          tokens: null,
          isAuthenticated: false,
        });
        return;
      }

      const user = await authApi.me();
      const activeTokens = (await getStoredAuthTokens()) ?? tokens;
      useErrorStore.getState().clearError();
      set({
        status: 'authenticated',
        user,
        tokens: activeTokens,
        isAuthenticated: true,
      });
    } catch {
      await clearStoredAuthTokens();
      queryClient.clear();
      set({
        status: 'unauthenticated',
        user: null,
        tokens: null,
        isAuthenticated: false,
      });
    } finally {
      useLoadingStore.getState().stopLoading();
    }
  },
  async setSession(session) {
    const tokens = {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    };

    await setStoredAuthTokens(tokens);

    try {
      const user = await authApi.me();
      const activeTokens = (await getStoredAuthTokens()) ?? tokens;
      set({
        status: 'authenticated',
        user,
        tokens: activeTokens,
        isAuthenticated: true,
      });
    } catch (error) {
      await clearStoredAuthTokens();
      set({
        status: 'unauthenticated',
        user: null,
        tokens: null,
        isAuthenticated: false,
      });
      throw error;
    }
  },
  applyRefreshedSession(session) {
    set({
      status: 'authenticated',
      user: session.user,
      tokens: {
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      },
      isAuthenticated: true,
    });
  },
  setUser(user) {
    set({ user });
  },
  async clearSession() {
    await clearStoredAuthTokens();
    queryClient.clear();
    useErrorStore.getState().clearError();
    set({
      status: 'unauthenticated',
      user: null,
      tokens: null,
      isAuthenticated: false,
    });
  },
  async logout() {
    useLoadingStore.getState().startLoading();
    const refreshToken = get().tokens?.refreshToken;

    try {
      if (refreshToken) {
        try {
          await authApi.logout(refreshToken);
        } catch {
          // Local logout should still clear credentials when server revocation fails.
        }
      }

      await get().clearSession();
    } finally {
      useLoadingStore.getState().stopLoading();
    }
  },
}));
