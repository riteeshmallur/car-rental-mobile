const {
  getBookingStatusLabel,
  getBookingTotal,
  getCustomerTripsPrimaryTab,
  hasBookingReturnPassedInKolkata,
  getRenterTripStatusLabel,
} = require('@/utils/booking-presentation');

describe('booking presentation', () => {
  it('keeps the backend booking total for cancelled and unpaid bookings', () => {
    expect(getBookingTotal({ totalPrice: '5354.00' })).toBe('5354.00');
    expect(getBookingTotal({ totalPrice: '4236.00' })).toBe('4236.00');
  });

  it('uses the booking and payment lifecycle for consistent labels', () => {
    expect(getBookingStatusLabel({ status: 'confirmed', paymentStatus: 'paid' })).toBe('Confirmed');
    expect(getBookingStatusLabel({ status: 'completed', paymentStatus: 'paid' })).toBe('Completed');
    expect(getBookingStatusLabel({ status: 'cancelled', paymentStatus: 'refund_pending' })).toBe('Cancelled');
    expect(getBookingStatusLabel({ status: 'pending_payment', paymentStatus: 'pending' })).toBe('Payment required');
    expect(getRenterTripStatusLabel({ status: 'pending_payment', paymentStatus: 'pending', tripPhase: 'payment_required' })).toBe('Payment required');
  });

  it('groups lifecycle statuses into three customer trip tabs without changing their badge status', () => {
    const now = new Date('2026-10-28T06:00:00.000Z');

    expect(getCustomerTripsPrimaryTab({ status: 'pending_payment', paymentStatus: 'pending', tripPhase: 'payment_required', returnAt: '2026-11-03T12:30:00.000Z' }, now)).toBe('upcoming');
    expect(getCustomerTripsPrimaryTab({ status: 'active', paymentStatus: 'paid', tripPhase: 'active', returnAt: '2026-10-06T09:10:00.000Z' }, now)).toBe('upcoming');
    expect(getCustomerTripsPrimaryTab({ status: 'return_pending', paymentStatus: 'paid', tripPhase: 'return_pending', returnAt: '2026-10-06T09:10:00.000Z' }, now)).toBe('upcoming');
    expect(getCustomerTripsPrimaryTab({ status: 'completed', paymentStatus: 'paid', tripPhase: 'completed', returnAt: '2026-10-06T09:10:00.000Z' }, now)).toBe('past');
    expect(getCustomerTripsPrimaryTab({ status: 'disputed', paymentStatus: 'paid', tripPhase: 'disputed', returnAt: '2026-10-06T09:10:00.000Z' }, now)).toBe('upcoming');
    expect(getCustomerTripsPrimaryTab({ status: 'cancelled', paymentStatus: 'refund_pending', tripPhase: 'cancelled', returnAt: '2026-11-03T12:30:00.000Z' }, now)).toBe('cancelled');
  });

  it('moves confirmed bookings to Past after their IST return timestamp', () => {
    const now = new Date('2026-10-28T06:00:00.000Z');
    const endedTrip = {
      status: 'confirmed',
      paymentStatus: 'paid',
      tripPhase: 'upcoming',
      // 2:40 PM IST on 6 October — well before the reference time above.
      returnAt: '2026-10-06T14:40:00',
    };

    expect(hasBookingReturnPassedInKolkata(endedTrip, now)).toBe(true);
    expect(getCustomerTripsPrimaryTab(endedTrip, now)).toBe('past');
  });
});
