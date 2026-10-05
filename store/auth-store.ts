import { create } from 'zustand';
import { Platform } from 'react-native';

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
    // Never render data cached for a prior session while the current session is
    // being restored. The authenticated routes mount only after validation below.
    queryClient.clear();

    try {
      const tokens = await getStoredAuthTokens();

      if (!tokens && Platform.OS !== 'web') {
        set({
          status: 'unauthenticated',
          user: null,
          tokens: null,
          isAuthenticated: false,
        });
        return;
      }

      if (Platform.OS === 'web') {
        // The browser keeps the long-lived session in an HttpOnly cookie. A
        // missing cookie is a normal signed-out state, not an application error.
        const session = await authApi.refresh(undefined, { suppressGlobalError: true });
        await setStoredAuthTokens({
          accessToken: session.accessToken,
          refreshToken: session.refreshToken,
        });
        const activeTokens = await getStoredAuthTokens();

        if (!activeTokens) {
          throw new Error('Your session could not be restored.');
        }

        const user = await authApi.me({ suppressGlobalError: true });

        useErrorStore.getState().clearError();
        set({
          status: 'authenticated',
          user,
          tokens: activeTokens,
          isAuthenticated: true,
        });
        return;
      }

      const user = await authApi.me({ suppressGlobalError: true });
      const activeTokens = (await getStoredAuthTokens()) ?? tokens;

      if (!activeTokens) {
        throw new Error('Your session has expired. Please log in again.');
      }
      useErrorStore.getState().clearError();
      set({
        status: 'authenticated',
        user,
        tokens: activeTokens,
        isAuthenticated: true,
      });
    } catch {
      await clearStoredAuthTokens();
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

    // A new OTP login can belong to a different account than the one that was
    // previously active in this app process.
    queryClient.clear();
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
      if (Platform.OS === 'web' || refreshToken) {
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
