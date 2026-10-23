import { type HostLifecycleStatus } from '@/services/hosts/hosts-api';

export type HostEntryAction = 'onboarding' | 'add_vehicle' | 'dashboard';

export type HostEntryCopy = {
  title: string;
  body: string;
  cta: string;
  action: HostEntryAction;
};

const homeEntries: Record<HostLifecycleStatus, HostEntryCopy> = {
  not_started: {
    title: 'Have a car to share?',
    body: 'List it on HopIn and start earning.',
    cta: 'Become a Host',
    action: 'onboarding',
  },
  in_progress: {
    title: 'Continue your host setup',
    body: 'Finish the details to start listing your car.',
    cta: 'Continue setup',
    action: 'onboarding',
  },
  profile_created: {
    title: 'Ready to list your car?',
    body: 'Add your first vehicle and submit it for review.',
    cta: 'Add your first car',
    action: 'add_vehicle',
  },
  active: {
    title: 'Manage your car listings',
    body: 'See bookings, listings, and earnings in host mode.',
    cta: 'Host Dashboard',
    action: 'dashboard',
  },
};

const profileEntries: Record<HostLifecycleStatus, HostEntryCopy> = {
  not_started: {
    title: 'Become a HopIn Host',
    body: 'List your car and start earning.',
    cta: 'Get started',
    action: 'onboarding',
  },
  in_progress: {
    title: 'Complete Host Setup',
    body: 'Resume your saved host onboarding.',
    cta: 'Continue setup',
    action: 'onboarding',
  },
  profile_created: {
    title: 'Switch to Host',
    body: 'Your host profile is ready to manage.',
    cta: 'Open host dashboard',
    action: 'dashboard',
  },
  active: {
    title: 'Switch to Host',
    body: 'Manage your cars, bookings, and earnings.',
    cta: 'Open host mode',
    action: 'dashboard',
  },
};

export function getHostEntryCopy(
  surface: 'home' | 'profile',
  status: HostLifecycleStatus,
) {
  return surface === 'home' ? homeEntries[status] : profileEntries[status];
}
