const {
  getPaymentScreenState,
  isConfirmedPaidBooking,
  isPaymentWindowOpen,
  isPendingPaymentBooking,
  shouldPollPayment,
} = require('@/features/customer/payment/payment-flow');

const booking = {
  status: 'pending_payment',
  totalPrice: '5498',
};

const payment = {
  amount: '5498',
  id: 'payment-1',
  status: 'pending',
};

describe('payment flow', () => {
  it('keeps confirmation gated behind confirmed booking and paid payment states', () => {
    expect(isPendingPaymentBooking(booking)).toBe(true);
    expect(isConfirmedPaidBooking(booking, { ...payment, status: 'paid' })).toBe(false);
    expect(
      isConfirmedPaidBooking(
        { ...booking, status: 'confirmed' },
        { ...payment, status: 'paid' },
      ),
    ).toBe(true);
  });

  it('maps backend payment statuses to retry, processing, and cancellation states', () => {
    expect(getPaymentScreenState(booking, null)).toBe('initiate');
    expect(getPaymentScreenState(booking, { ...payment, status: 'failed' })).toBe('failed');
    expect(getPaymentScreenState(booking, { ...payment, status: 'cancelled' })).toBe('cancelled');
    expect(getPaymentScreenState(booking, { ...payment, status: 'processing' })).toBe('processing');
    expect(shouldPollPayment(booking, { ...payment, status: 'processing' })).toBe(true);
    expect(shouldPollPayment({ ...booking, status: 'confirmed' }, { ...payment, status: 'paid' })).toBe(false);
  });

  it('expires a pending booking once its pickup time has passed and prevents new payment attempts', () => {
    const now = new Date('2026-10-30T06:00:00.000Z');
    const expiredBooking = {
      ...booking,
      pickupAt: '2026-10-30T10:00:00.000+05:30',
    };

    expect(isPaymentWindowOpen(expiredBooking, now)).toBe(false);
    expect(getPaymentScreenState(expiredBooking, null, now)).toBe('expired');
  });

});
