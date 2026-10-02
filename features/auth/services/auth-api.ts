import { apiRequest, type ApiRequestConfig } from '@/services/api/client';
import { Platform } from 'react-native';
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
      data: {
        ...payload,
        clientType: Platform.OS === 'web' ? 'web' : 'mobile',
      },
    });
  },
  refresh(refreshToken?: string, options: Pick<ApiRequestConfig, 'suppressGlobalError'> = {}) {
    return apiRequest<AuthResponse>({
      method: 'POST',
      url: '/auth/refresh',
      data: refreshToken ? { refreshToken } : {},
      ...options,
    });
  },
  me(options: Pick<ApiRequestConfig, 'suppressGlobalError'> = {}) {
    return apiRequest<SafeUser>({
      method: 'GET',
      url: '/auth/me',
      ...options,
    });
  },
  logout(refreshToken?: string) {
    return apiRequest<null>({
      method: 'POST',
      url: '/auth/logout',
      data: refreshToken ? { refreshToken } : {},
    });
  },
};
