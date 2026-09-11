import { apiRequest } from '@/services/api/client';
import { type SafeUser } from '@/types/auth';

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
};
