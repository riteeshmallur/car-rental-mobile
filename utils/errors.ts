import { isAxiosError } from 'axios';

import { type AppError } from '@/types/api';

type BackendErrorPayload = {
  code?: string;
  error?: string;
  message?: string | string[];
  statusCode?: number;
};

function messageFromPayload(payload: BackendErrorPayload) {
  if (Array.isArray(payload.message)) {
    return payload.message.join('\n');
  }

  return payload.message || payload.error;
}

export function normalizeApiError(error: unknown): AppError {
  if (isAxiosError<BackendErrorPayload>(error)) {
    const payload = error.response?.data;
    const message = payload ? messageFromPayload(payload) : error.message;

    return {
      message: message || 'Unable to complete the request.',
      statusCode: payload?.statusCode || error.response?.status,
      code: payload?.code,
      raw: error,
    };
  }

  if (error instanceof Error) {
    return {
      message: error.message,
      raw: error,
    };
  }

  return {
    message: 'Something went wrong.',
    raw: error,
  };
}
