import { type SafeUser, UserRole } from '@/types/auth';

/**
 * Host access is derived from the authenticated backend user. Mode changes only
 * replace the active route; they never change the account or auth session.
 */
export function canAccessHostMode(user: SafeUser | null | undefined) {
  return Boolean(
    user?.capabilities.canHost ||
      user?.hostEnabled ||
      user?.role === UserRole.Host ||
      user?.role === UserRole.Admin,
  );
}

export const customerModeRoute = '/(customer)/home';
export const hostModeRoute = '/(host)/dashboard';
