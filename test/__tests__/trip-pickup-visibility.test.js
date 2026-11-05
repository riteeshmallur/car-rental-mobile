const { canViewTripPickupInformation } = require('@/utils/trip-pickup-visibility');

const now = Date.parse('2026-10-29T04:30:00.000Z');

function trip(overrides = {}) {
  return {
    capabilities: { viewPickupInformation: true },
    returnAt: '2026-10-31T12:30:00.000Z',
    stage: 'confirmed',
    statusPresentation: { lifecycle: 'upcoming', timing: 'on_schedule' },
    ...overrides,
  };
}

describe('trip pickup information visibility', () => {
  it('keeps pickup instructions available when the backend allows them', () => {
    expect(canViewTripPickupInformation(trip())).toBe(true);
  });

  it('hides pickup instructions after the backend reports a missed pickup', () => {
    expect(canViewTripPickupInformation(trip({ statusPresentation: { lifecycle: 'upcoming', timing: 'pickup_overdue' } }))).toBe(false);
  });

  it('hides pickup information for terminal and post-pickup stages', () => {
    for (const stage of ['return_pending', 'completed', 'cancelled', 'disputed']) {
      expect(canViewTripPickupInformation(trip({ stage }))).toBe(false);
    }
  });
});
