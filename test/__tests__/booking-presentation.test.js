const {
  getBookingStatusLabel,
  getBookingTotal,
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
});
