const { getTripActionVisibility } = require('@/utils/trip-action-visibility');

const allCapabilities = {
  cancel: true,
  reportIssue: true,
  requestExtension: true,
  review: true,
  viewReceipt: true,
  viewReturnInstructions: true,
};

function makeTrip(overrides = {}) {
  return {
    capabilities: allCapabilities,
    returnAt: '2026-10-06T14:40:00.000+05:30',
    stage: 'confirmed',
    ...overrides,
  };
}

describe('trip action visibility', () => {
  const now = new Date('2026-10-28T06:00:00.000Z');

  it('removes rental-changing actions for a past booking while preserving permitted receipt, review, and issue actions', () => {
    expect(getTripActionVisibility(makeTrip(), now)).toEqual({
      cancel: false,
      reportIssue: true,
      requestExtension: false,
      review: true,
      viewReceipt: true,
      viewReturnInstructions: false,
    });
  });

  it('keeps return and dispute actions available for unresolved trips', () => {
    expect(getTripActionVisibility(makeTrip({ stage: 'return_pending' }), now)).toEqual(allCapabilities);
    expect(getTripActionVisibility(makeTrip({ stage: 'disputed' }), now)).toEqual(allCapabilities);
  });
});
