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
  payoutStatus: string | null;
  draft: HostOnboardingDraft | null;
};

export type HostSetupTaskKey =
  | 'host_profile'
  | 'first_car'
  | 'identity_verification'
  | 'payout_setup';

export type HostSetupTaskStatus =
  | 'completed'
  | 'pending'
  | 'under_review'
  | 'action_required';

export type HostSetupStatus = {
  status: 'setup_in_progress' | 'complete';
  completedTasks: number;
  totalTasks: number;
  tasks: Array<{ key: HostSetupTaskKey; status: HostSetupTaskStatus }>;
  identityDocumentType: string | null;
  identityDocumentLast4: string | null;
  payoutMethod: string | null;
  payoutAccountLast4: string | null;
  payoutAccountHolderName: string | null;
};

export type SubmitHostIdentityVerificationPayload = {
  documentType: 'driving_licence' | 'national_id' | 'passport';
  documentNumber: string;
};

export type SetupHostPayoutPayload = {
  method: 'upi' | 'bank_account';
  accountHolderName: string;
  upiId?: string;
  accountNumber?: string;
  ifscCode?: string;
};

export type CompleteHostOnboardingPayload = {
  terms: {
    accepted: boolean;
    policyVersion: string;
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
      url: '/hosts/me/onboarding',
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
  setupStatus() {
    return apiRequest<HostSetupStatus>({ method: 'GET', url: '/hosts/me/setup-status' });
  },
  submitIdentityVerification(payload: SubmitHostIdentityVerificationPayload) {
    return apiRequest<HostProfile>({
      method: 'PATCH',
      url: '/hosts/me/identity-verification',
      data: payload,
    });
  },
  setupPayoutAccount(payload: SetupHostPayoutPayload) {
    return apiRequest<HostProfile>({
      method: 'PATCH',
      url: '/hosts/me/payout-account',
      data: payload,
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
