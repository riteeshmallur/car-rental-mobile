import axios, {
  isAxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';
import { Platform } from 'react-native';

import {
  clearStoredAuthTokens,
  getStoredAuthTokens,
  setStoredAuthTokens,
} from '@/services/storage/secure-token-storage';
import { useErrorStore } from '@/store/error-store';
import { type ApiResponse } from '@/types/api';
import { type AuthResponse } from '@/types/auth';
import { normalizeApiError } from '@/utils/errors';

import { env } from '../config/env';

export const apiClient = axios.create({
  baseURL: env.apiUrl,
  timeout: 15000,
  withCredentials: Platform.OS === 'web',
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
  suppressGlobalError?: boolean;
};

export type ApiRequestConfig = AxiosRequestConfig & {
  /** Use for authentication restoration where an unauthenticated result is normal. */
  suppressGlobalError?: boolean;
};

type AuthSessionHandlers = {
  onSessionExpired: () => void | Promise<void>;
  onSessionRefreshed: (session: AuthResponse) => void;
};

let authSessionHandlers: AuthSessionHandlers | null = null;
let refreshRequest: Promise<AuthResponse> | null = null;

function getWebCsrfToken() {
  if (Platform.OS !== 'web' || typeof document === 'undefined') {
    return null;
  }

  const cookieName = process.env.EXPO_PUBLIC_AUTH_CSRF_COOKIE_NAME ?? 'hopin_csrf';
  const cookie = document.cookie
    .split(';')
    .map((value) => value.trim())
    .find((value) => value.startsWith(`${cookieName}=`));

  return cookie ? decodeURIComponent(cookie.slice(cookieName.length + 1)) : null;
}

function csrfHeaders() {
  const csrfToken = getWebCsrfToken();
  return csrfToken ? { 'X-CSRF-Token': csrfToken } : {};
}

export function registerApiAuthSessionHandlers(handlers: AuthSessionHandlers) {
  authSessionHandlers = handlers;

  return () => {
    if (authSessionHandlers === handlers) {
      authSessionHandlers = null;
    }
  };
}

function isSessionEndpoint(url?: string) {
  return Boolean(
    url &&
      ['/auth/otp/request', '/auth/otp/verify', '/auth/refresh', '/auth/logout'].some(
        (path) => url.includes(path),
      ),
  );
}

async function rotateSession() {
  const tokens = await getStoredAuthTokens();

  if (Platform.OS !== 'web' && !tokens?.refreshToken) {
    throw new Error('Your session has expired. Please log in again.');
  }

  try {
    const response = await axios.post<ApiResponse<AuthResponse>>(
      `${env.apiUrl}/auth/refresh`,
      tokens?.refreshToken ? { refreshToken: tokens.refreshToken } : {},
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
          ...csrfHeaders(),
        },
        timeout: 15000,
        withCredentials: Platform.OS === 'web',
      },
    );
    const session = response.data.data;

    await setStoredAuthTokens({
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
    });
    authSessionHandlers?.onSessionRefreshed(session);
    return session;
  } catch (error) {
    await clearStoredAuthTokens();
    await authSessionHandlers?.onSessionExpired();
    throw error;
  }
}

async function getRefreshedSession() {
  const activeRequest = refreshRequest ?? (refreshRequest = rotateSession());

  try {
    return await activeRequest;
  } finally {
    if (refreshRequest === activeRequest) {
      refreshRequest = null;
    }
  }
}

apiClient.interceptors.request.use(async (config) => {
  const tokens = await getStoredAuthTokens();

  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  if (isSessionEndpoint(config.url)) {
    const csrfToken = getWebCsrfToken();
    if (csrfToken) {
      config.headers.set('X-CSRF-Token', csrfToken);
    }
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    const errorRequestConfig = isAxiosError(error) && error.config
      ? (error.config as RetryableRequestConfig)
      : undefined;

    if (isAxiosError(error) && error.response?.status === 401 && error.config) {
      const requestConfig = error.config as RetryableRequestConfig;

      if (!requestConfig._retry && !isSessionEndpoint(requestConfig.url)) {
        requestConfig._retry = true;

        try {
          const session = await getRefreshedSession();
          requestConfig.headers.Authorization = `Bearer ${session.accessToken}`;
          return await apiClient.request(requestConfig);
        } catch (refreshError) {
          if (!requestConfig.suppressGlobalError) {
            useErrorStore.getState().setError(normalizeApiError(refreshError));
          }
          return Promise.reject(refreshError);
        }
      }
    }

    if (!errorRequestConfig?.suppressGlobalError) {
      useErrorStore.getState().setError(normalizeApiError(error));
    }
    return Promise.reject(error);
  },
);

export async function apiRequest<T>(config: ApiRequestConfig): Promise<T> {
  const response = await apiClient.request<ApiResponse<T>>(config);
  return response.data.data;
}
