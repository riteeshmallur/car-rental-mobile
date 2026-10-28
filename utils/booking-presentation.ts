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
  if (booking.status === 'pending_payment' && booking.paymentStatus === 'pending') return 'Payment required';
  if (booking.status === 'pending_host_approval') return 'Awaiting host';
  return getBookingStatusLabel(booking);
}

export type CustomerTripsPrimaryTab = 'upcoming' | 'past' | 'cancelled';

export const KOLKATA_TIME_ZONE = 'Asia/Kolkata';
const IST_UTC_OFFSET = '+05:30';

/**
 * Backend timestamps are expected to be ISO strings with an offset. Treat a
 * legacy timestamp without an offset as India Standard Time rather than the
 * device's local timezone, so trip grouping is consistent on every client.
 */
function toKolkataTimestamp(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const normalized = value.includes('T') ? value : value.replace(' ', 'T');
  const hasOffset = /(?:Z|[+-]\d{2}:?\d{2})$/i.test(normalized);
  const withTimeZone = hasOffset
    ? normalized
    : normalized.includes('T')
      ? `${normalized}${IST_UTC_OFFSET}`
      : `${normalized}T00:00:00${IST_UTC_OFFSET}`;
  const timestamp = new Date(withTimeZone).getTime();

  return Number.isNaN(timestamp) ? null : timestamp;
}

export function hasBookingReturnPassedInKolkata(
  booking: Pick<RenterBooking, 'returnAt'>,
  now = new Date(),
) {
  // A Date represents an absolute instant. The timezone matters while parsing
  // legacy offset-free backend values; once parsed, this comparison is stable
  // for users in IST and users browsing from another timezone.
  const returnTimestamp = toKolkataTimestamp(booking.returnAt);

  return returnTimestamp !== null && returnTimestamp <= now.getTime();
}

/**
 * Customer Trips deliberately presents only three destinations. The detailed
 * lifecycle remains in the card badge; this mapping only determines where an
 * authoritative backend booking is grouped.
 */
export function getCustomerTripsPrimaryTab(
  booking: RenterBooking,
  now = new Date(),
): CustomerTripsPrimaryTab {
  if (
    booking.tripPhase === 'cancelled' ||
    booking.status === 'cancelled' ||
    booking.status === 'failed' ||
    booking.status === 'expired' ||
    booking.paymentStatus === 'failed' ||
    booking.paymentStatus === 'cancelled'
  ) {
    return 'cancelled';
  }

  if (booking.tripPhase === 'completed' || booking.status === 'completed') {
    return 'past';
  }

  // These statuses represent an unresolved handover or dispute. Keep them in
  // the actionable Upcoming tab even when their scheduled return has elapsed.
  if (
    booking.tripPhase === 'active' ||
    booking.tripPhase === 'return_pending' ||
    booking.tripPhase === 'disputed' ||
    booking.status === 'active' ||
    booking.status === 'return_pending' ||
    booking.status === 'disputed'
  ) {
    return 'upcoming';
  }

  if (hasBookingReturnPassedInKolkata(booking, now)) {
    return 'past';
  }

  return 'upcoming';
}
