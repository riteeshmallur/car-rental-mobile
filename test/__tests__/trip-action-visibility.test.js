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
    pickup: { verifiedAt: '2026-10-05T10:00:00.000+05:30' },
    returnAt: '2026-10-06T14:40:00.000+05:30',
    stage: 'confirmed',
    statusPresentation: { lifecycle: 'upcoming', timing: 'on_schedule' },
    ...overrides,
  };
}

describe('trip action visibility', () => {
  it('uses backend capabilities after the recorded pickup event', () => {
    expect(getTripActionVisibility(makeTrip())).toEqual(allCapabilities);
  });

  it('does not offer issue reporting before pickup verification', () => {
    expect(getTripActionVisibility(makeTrip({ pickup: { verifiedAt: null } }))).toEqual({
      ...allCapabilities,
      reportIssue: false,
    });
  });

  it('keeps return and dispute actions available for unresolved trips', () => {
    expect(getTripActionVisibility(makeTrip({ stage: 'return_pending' }))).toEqual(allCapabilities);
    expect(getTripActionVisibility(makeTrip({ stage: 'disputed' }))).toEqual(allCapabilities);
  });
});
