export enum UserRole {
  Customer = 'customer',
  Host = 'host',
  Admin = 'admin',
}

export type SafeUser = {
  id: string;
  firstName: string | null;
  lastName: string | null;
  email: string | null;
  phoneNumber: string | null;
  phoneVerified: boolean;
  phoneVerifiedAt: string | null;
  profileImageUrl: string | null;
  role: UserRole;
  hostEnabled: boolean;
  hostOnboardingCompletedAt: string | null;
  capabilities: {
    canRent: boolean;
    canHost: boolean;
  };
  isEmailVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
};

export type AuthTokens = {
  accessToken: string;
  refreshToken: string;
};

export type AuthResponse = AuthTokens & {
  user: SafeUser & {
    isNewUser?: boolean;
  };
};

export type RequestOtpPayload = {
  phoneNumber: string;
};

export type VerifyOtpPayload = RequestOtpPayload & {
  otp: string;
};

export type OtpRequestResponse = {
  message: string;
  expiresIn: number;
};
