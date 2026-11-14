import { getPayoutStatusPresentation } from '@/features/host-earnings/utils/payout-status';

describe('getPayoutStatusPresentation', () => {
  test.each([
    ['pending', 'Pending', false],
    ['eligible', 'Eligible for payout', false],
    ['awaiting_approval', 'Awaiting approval', false],
    ['approved', 'Approved for processing', false],
    ['processing', 'Processing transfer', false],
    ['paid', 'Paid', true],
    ['completed', 'Paid', true],
    ['failed', 'Payout failed', false],
    ['reconciliation_required', 'Verification required', false],
    ['on_hold', 'On hold', false],
    ['cancelled', 'Cancelled', false],
  ])('maps %s safely', (status, label, isPaid) => {
    expect(getPayoutStatusPresentation(status)).toMatchObject({ label, isPaid });
  });

  it('does not treat an unknown status as paid', () => {
    expect(getPayoutStatusPresentation('future_status')).toEqual({
      label: 'Status unavailable',
      tone: 'neutral',
      isPaid: false,
    });
  });
});
