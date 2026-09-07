import { apiRequest } from '@/services/api/client';
import {
  type AuthResponse,
  type OtpRequestResponse,
  type RequestOtpPayload,
  type SafeUser,
  type VerifyOtpPayload,
} from '@/types/auth';

export const authApi = {
  requestOtp(payload: RequestOtpPayload) {
    return apiRequest<OtpRequestResponse>({
      method: 'POST',
      url: '/auth/otp/request',
      data: payload,
    });
  },
  verifyOtp(payload: VerifyOtpPayload) {
    return apiRequest<AuthResponse>({
      method: 'POST',
      url: '/auth/otp/verify',
      data: payload,
    });
  },
  refresh(refreshToken: string) {
    return apiRequest<AuthResponse>({
      method: 'POST',
      url: '/auth/refresh',
      data: { refreshToken },
    });
  },
  me() {
    return apiRequest<SafeUser>({
      method: 'GET',
      url: '/auth/me',
    });
  },
  logout(refreshToken: string) {
    return apiRequest<null>({
      method: 'POST',
      url: '/auth/logout',
      data: { refreshToken },
    });
  },
};
