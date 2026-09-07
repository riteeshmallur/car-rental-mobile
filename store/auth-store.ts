import { create } from 'zustand';

import { authApi } from '@/features/auth/services/auth-api';
import {
  clearStoredAuthTokens,
  getStoredAuthTokens,
  setStoredAuthTokens,
} from '@/services/storage/secure-token-storage';
import { useErrorStore } from '@/store/error-store';
import { type AuthResponse, type AuthTokens, type SafeUser } from '@/types/auth';

import { useLoadingStore } from './loading-store';

type AuthStatus = 'bootstrapping' | 'authenticated' | 'unauthenticated';

type AuthState = {
  status: AuthStatus;
  user: SafeUser | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  bootstrap: () => Promise<void>;
  setSession: (session: AuthResponse) => Promise<void>;
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

      try {
        const user = await authApi.me();
        useErrorStore.getState().clearError();
        set({
          status: 'authenticated',
          user,
          tokens,
          isAuthenticated: true,
        });
      } catch {
        const refreshedSession = await authApi.refresh(tokens.refreshToken);
        await get().setSession(refreshedSession);
        useErrorStore.getState().clearError();
      }
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

    await setStoredAuthTokens(tokens);

    try {
      const user = await authApi.me();
      set({
        status: 'authenticated',
        user,
        tokens,
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
  async clearSession() {
    await clearStoredAuthTokens();
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
