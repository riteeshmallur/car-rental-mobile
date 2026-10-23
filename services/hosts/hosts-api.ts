import { apiRequest } from '@/services/api/client';
import {
  type HostBooking,
  type HostCalendarEvent,
  type HostDashboard,
  type HostEarningsParams,
  type HostEarningsResponse,
  type HostPayoutRecord,
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

export type HostLifecycleStatus =
  | 'not_started'
  | 'in_progress'
  | 'profile_created'
  | 'active';

export type HostOnboardingDraft = {
  activeStepIndex: number;
  values: Record<string, unknown>;
  updatedAt: string;
};

export type HostStatus = {
  status: HostLifecycleStatus;
  onboardingStatus: string | null;
  verificationStatus: string | null;
  draft: HostOnboardingDraft | null;
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
  status() {
    return apiRequest<HostStatus>({
      method: 'GET',
      url: '/hosts/me/status',
    });
  },
  saveOnboardingDraft(payload: Pick<HostOnboardingDraft, 'activeStepIndex' | 'values'>) {
    return apiRequest<HostStatus>({
      method: 'PATCH',
      url: '/hosts/me/onboarding-draft',
      data: payload,
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
  dashboard() {
    return apiRequest<HostDashboard>({ method: 'GET', url: '/hosts/me/dashboard' });
  },
  calendar(params: { startsAt?: string; endsAt?: string } = {}) {
    return apiRequest<HostCalendarEvent[]>({
      method: 'GET',
      url: '/hosts/me/calendar',
      params,
    });
  },
  earnings(params: HostEarningsParams = {}) {
    return apiRequest<HostEarningsResponse>({
      method: 'GET',
      url: '/hosts/me/earnings',
      params,
    });
  },
  payouts() {
    return apiRequest<HostPayoutRecord[]>({
      method: 'GET',
      url: '/hosts/me/payouts',
    });
  },
};
