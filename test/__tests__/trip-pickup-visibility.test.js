const { canViewTripPickupInformation } = require('@/utils/trip-pickup-visibility');

const now = Date.parse('2026-10-29T04:30:00.000Z');

function trip(overrides = {}) {
  return {
    capabilities: { viewPickupInformation: true },
    returnAt: '2026-10-31T12:30:00.000Z',
    stage: 'confirmed',
    ...overrides,
  };
}

describe('trip pickup information visibility', () => {
  it('keeps pickup instructions available before the rental has ended', () => {
    expect(canViewTripPickupInformation(trip(), now)).toBe(true);
  });

  it('hides pickup instructions and host contact after the return time', () => {
    expect(
      canViewTripPickupInformation(trip({ returnAt: '2026-10-06T09:10:00.000Z' }), now),
    ).toBe(false);
  });

  it('hides pickup information for terminal and post-pickup stages', () => {
    for (const stage of ['return_pending', 'completed', 'cancelled', 'disputed']) {
      expect(canViewTripPickupInformation(trip({ stage }), now)).toBe(false);
    }
  });
});
