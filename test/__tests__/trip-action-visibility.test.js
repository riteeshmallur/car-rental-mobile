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
    statusPresentation: { lifecycle: 'upcoming', timing: 'on_schedule' },
    ...overrides,
  };
}

describe('trip action visibility', () => {
  it('uses backend capabilities without re-deriving action eligibility from device time', () => {
    expect(getTripActionVisibility(makeTrip())).toEqual(allCapabilities);
  });

  it('keeps return and dispute actions available for unresolved trips', () => {
    expect(getTripActionVisibility(makeTrip({ stage: 'return_pending' }))).toEqual(allCapabilities);
    expect(getTripActionVisibility(makeTrip({ stage: 'disputed' }))).toEqual(allCapabilities);
  });
});
