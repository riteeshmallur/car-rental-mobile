import { apiRequest } from '@/services/api/client';
import {
  type HostBooking,
  type HostEarningsParams,
  type HostEarningsResponse,
  type HostPayoutsResponse,
  type HostVehicleListing,
} from '@/types/car';

export type HostProfile = {
  userId: string;
  verificationStatus: string;
  onboardingStatus: string;
  displayName: string;
  bio: string;
  payoutStatus: string;
  createdAt: string;
  updatedAt: string;
};

export type CompleteHostOnboardingPayload = {
  personalInfo: {
    firstName: string;
    lastName: string;
    email: string;
    phoneNumber: string;
  };
  identity: {
    documentType: 'aadhaar' | 'pan' | 'passport' | 'driving_license';
    documentLast4: string;
    verificationConsent: boolean;
  };
  payout: {
    payoutMethod: 'upi' | 'bank_account';
    accountHolderName: string;
    bankName?: string | null;
    accountLast4?: string | null;
    upiId?: string | null;
  };
  terms: {
    accepted: boolean;
  };
  hostProfile: {
    displayName: string;
    bio: string;
  };
};

export const hostsApi = {
  completeOnboarding(payload: CompleteHostOnboardingPayload) {
    return apiRequest<HostProfile>({
      method: 'POST',
      url: '/hosts/onboarding',
      data: payload,
    });
  },
  me() {
    return apiRequest<HostProfile>({
      method: 'GET',
      url: '/hosts/me',
    });
  },
  updateMe(payload: Pick<HostProfile, 'displayName' | 'bio'>) {
    return apiRequest<HostProfile>({
      method: 'PATCH',
      url: '/hosts/me',
      data: payload,
    });
  },
  listVehicles() {
    return apiRequest<HostVehicleListing[]>({
      method: 'GET',
      url: '/hosts/me/vehicles',
    });
  },
  listBookings() {
    return apiRequest<HostBooking[]>({
      method: 'GET',
      url: '/hosts/me/bookings',
    });
  },
  earnings(params: HostEarningsParams = {}) {
    return apiRequest<HostEarningsResponse>({
      method: 'GET',
      url: '/hosts/me/earnings',
      params,
    });
  },
  payouts(params: HostEarningsParams = {}) {
    return apiRequest<HostPayoutsResponse>({
      method: 'GET',
      url: '/hosts/me/payouts',
      params,
    });
  },
};
