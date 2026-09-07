import axios, { type AxiosRequestConfig } from 'axios';

import { getStoredAuthTokens } from '@/services/storage/secure-token-storage';
import { useErrorStore } from '@/store/error-store';
import { type ApiResponse } from '@/types/api';
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

apiClient.interceptors.request.use(async (config) => {
  const tokens = await getStoredAuthTokens();

  if (tokens?.accessToken) {
    config.headers.Authorization = `Bearer ${tokens.accessToken}`;
  }

  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error: unknown) => {
    useErrorStore.getState().setError(normalizeApiError(error));
    return Promise.reject(error);
  },
);

export async function apiRequest<T>(config: AxiosRequestConfig): Promise<T> {
  const response = await apiClient.request<ApiResponse<T>>(config);
  return response.data.data;
}
