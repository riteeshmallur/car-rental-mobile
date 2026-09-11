import { isAxiosError } from 'axios';

import { type AppError } from '@/types/api';

type BackendErrorPayload = {
  code?: string;
  message?: string | string[];
  statusCode?: number;
  error?: string | {
    code?: string;
    statusCode?: number;
  };
};

function messageFromPayload(payload: BackendErrorPayload) {
  if (Array.isArray(payload.message)) {
    return payload.message.join('\n');
  }

  return payload.message || (typeof payload.error === 'string' ? payload.error : undefined);
}

export function normalizeApiError(error: unknown): AppError {
  if (isAxiosError<BackendErrorPayload>(error)) {
    const payload = error.response?.data;
    const message = payload ? messageFromPayload(payload) : error.message;

    return {
      message: message || 'Unable to complete the request.',
      statusCode:
        payload?.statusCode ||
        (typeof payload?.error === 'object' ? payload.error.statusCode : undefined) ||
        error.response?.status,
      code:
        payload?.code ||
        (typeof payload?.error === 'object' ? payload.error.code : undefined),
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
