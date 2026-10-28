import { type Booking, type RenterBooking } from '@/types/car';

type BookingLifecycle = Pick<Booking, 'paymentStatus' | 'status'>;

/**
 * A booking's total is fixed by the backend quote snapshot. Payments and
 * refunds are shown independently, so a cancelled or unpaid booking must not
 * substitute its total with the amount captured so far.
 */
export function getBookingTotal(booking: Pick<Booking, 'totalPrice'>) {
  return booking.totalPrice;
}

/** Shared, backend-status-driven wording for all booking list/detail views. */
export function getBookingStatusLabel(booking: BookingLifecycle) {
  if (booking.status === 'pending_payment') return 'Payment required';
  if (booking.status === 'pending_host_approval') return 'Awaiting host approval';
  if (booking.paymentStatus === 'failed' || booking.status === 'failed') return 'Payment failed';
  if (booking.paymentStatus === 'cancelled') return 'Payment cancelled';

  switch (booking.status) {
    case 'ready_for_pickup': return 'Ready for pickup';
    case 'return_pending': return 'Return pending';
    case 'completed': return 'Completed';
    case 'cancelled': return 'Cancelled';
    case 'expired': return 'Expired';
    case 'disputed': return 'Disputed';
    case 'active': return 'Active';
    case 'confirmed': return 'Confirmed';
    default: return 'Pending';
  }
}

export function getRenterTripStatusLabel(booking: RenterBooking) {
  if (booking.tripPhase === 'payment_required') return 'Payment required';
  if (booking.tripPhase === 'awaiting_host_approval') return 'Awaiting host';
  return getBookingStatusLabel(booking);
}
