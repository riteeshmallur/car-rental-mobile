import { apiRequest } from '@/services/api/client';
import { type SafeUser } from '@/types/auth';

export type PaymentMethod = {
  id: string;
  provider: string;
  brand: string;
  last4: string;
  expMonth: number | null;
  expYear: number | null;
  isDefault: boolean;
  createdAt: string;
};

export type AccountDataExport = {
  id: string;
  status: 'pending' | 'ready' | 'failed' | 'expired';
  requestedAt: string;
  completedAt: string | null;
  expiresAt: string;
  failureMessage: string | null;
};

export type AccountDeletionRequest = {
  id: string;
  status: 'requested' | 'cancelled' | 'completed';
  requestedAt: string;
  processedAt: string | null;
};

export type UpdateCurrentUserPayload = {
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phoneNumber?: string | null;
  profileImageUrl?: string | null;
};

export const usersApi = {
  me() {
    return apiRequest<SafeUser>({
      method: 'GET',
      url: '/users/me',
    });
  },
  updateMe(payload: UpdateCurrentUserPayload) {
    return apiRequest<SafeUser>({
      method: 'PATCH',
      url: '/users/me',
      data: payload,
    });
  },
  paymentMethods() {
    return apiRequest<PaymentMethod[]>({ method: 'GET', url: '/users/me/payment-methods' });
  },
  setDefaultPaymentMethod(paymentMethodId: string) {
    return apiRequest<PaymentMethod>({
      method: 'PATCH',
      url: `/users/me/payment-methods/${paymentMethodId}/default`,
    });
  },
  latestDataExport() {
    return apiRequest<AccountDataExport | null>({
      method: 'GET',
      url: '/users/me/data-exports/latest',
    });
  },
  requestDataExport() {
    return apiRequest<AccountDataExport>({ method: 'POST', url: '/users/me/data-exports' });
  },
  latestDeletionRequest() {
    return apiRequest<AccountDeletionRequest | null>({
      method: 'GET',
      url: '/users/me/deletion-requests/latest',
    });
  },
  requestDeletion() {
    return apiRequest<AccountDeletionRequest>({
      method: 'POST',
      url: '/users/me/deletion-requests',
    });
  },
};
