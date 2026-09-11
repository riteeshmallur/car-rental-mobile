import axios, {
  isAxiosError,
  type AxiosRequestConfig,
  type InternalAxiosRequestConfig,
} from 'axios';

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
  headers: {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
});

type RetryableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean;
};

type AuthSessionHandlers = {
  onSessionExpired: () => void | Promise<void>;
  onSessionRefreshed: (session: AuthResponse) => void;
};

let authSessionHandlers: AuthSessionHandlers | null = null;
let refreshRequest: Promise<AuthResponse> | null = null;

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

  if (!tokens?.refreshToken) {
    throw new Error('Your session has expired. Please log in again.');
  }

  try {
    const response = await axios.post<ApiResponse<AuthResponse>>(
      `${env.apiUrl}/auth/refresh`,
      { refreshToken: tokens.refreshToken },
      {
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        timeout: 15000,
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

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  async (error: unknown) => {
    if (isAxiosError(error) && error.response?.status === 401 && error.config) {
      const requestConfig = error.config as RetryableRequestConfig;

      if (!requestConfig._retry && !isSessionEndpoint(requestConfig.url)) {
        requestConfig._retry = true;

        try {
          const session = await getRefreshedSession();
          requestConfig.headers.Authorization = `Bearer ${session.accessToken}`;
          return await apiClient.request(requestConfig);
        } catch (refreshError) {
          useErrorStore.getState().setError(normalizeApiError(refreshError));
          return Promise.reject(refreshError);
        }
      }
    }

    useErrorStore.getState().setError(normalizeApiError(error));
    return Promise.reject(error);
  },
);

export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<ApiResponse<T>>(config);
  return response.data.data;
}
