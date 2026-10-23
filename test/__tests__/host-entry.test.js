const { getHostEntryCopy } = require('@/features/host/utils/host-entry');

describe('host entry cards', () => {
  it.each([
    ['not_started', 'Have a car to share?', 'Become a Host', 'onboarding'],
    ['in_progress', 'Continue your host setup', 'Continue setup', 'onboarding'],
    ['profile_created', 'Ready to list your car?', 'Add your first car', 'add_vehicle'],
    ['active', 'Manage your car listings', 'Host Dashboard', 'dashboard'],
  ])('maps the %s backend lifecycle to the Home card', (status, title, cta, action) => {
    expect(getHostEntryCopy('home', status)).toMatchObject({ title, cta, action });
  });

  it.each([
    ['not_started', 'Become a HopIn Host', 'Get started'],
    ['in_progress', 'Complete Host Setup', 'Continue setup'],
    ['profile_created', 'Switch to Host', 'Open host dashboard'],
    ['active', 'Switch to Host', 'Open host mode'],
  ])('maps the %s backend lifecycle to the Profile card', (status, title, cta) => {
    expect(getHostEntryCopy('profile', status)).toMatchObject({ title, cta });
  });
});
