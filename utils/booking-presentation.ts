import { type Booking, type RenterBooking, type RenterTrip } from '@/types/car';

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
  const status = getBookingPresentationState(booking);

  switch (status) {
    case 'pickup_overdue': return 'Pickup not confirmed';
    case 'return_overdue': return 'Return overdue';
    case 'payment_required': return 'Payment required';
    case 'payment_processing': return 'Payment processing';
    case 'payment_failed': return 'Payment failed';
    case 'payment_cancelled': return 'Payment cancelled';
    case 'payment_expired': return 'Payment expired';
    case 'awaiting_host_approval': return 'Awaiting host approval';
    default: return getBookingStatusLabel(booking);
  }
}

export function getBookingPresentationState(
  booking: Pick<RenterBooking, 'statusPresentation'>,
) {
  return booking.statusPresentation.timing === 'on_schedule'
    ? booking.statusPresentation.lifecycle
    : booking.statusPresentation.timing;
}

export function getTripPresentationState(
  trip: Pick<RenterTrip, 'statusPresentation' | 'stage'>,
) {
  return trip.statusPresentation.timing === 'on_schedule'
    ? trip.statusPresentation.lifecycle
    : trip.statusPresentation.timing;
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
 * A passed rental window makes a booking historical in the customer UI, but
 * never changes the backend lifecycle stage. Unresolved handovers and
 * disputes remain actionable until the backend resolves them.
 */
export function isRenterTripPast(
  trip: Pick<RenterTrip, 'stage' | 'statusPresentation'>,
) {
  if (trip.statusPresentation.timing === 'pickup_overdue') {
    return true;
  }
  if (trip.stage === 'completed' || trip.stage === 'cancelled') {
    return true;
  }

  if (
    trip.stage === 'active' ||
    trip.stage === 'return_pending' ||
    trip.stage === 'disputed'
  ) {
    return false;
  }

  return false;
}

/**
 * Customer Trips deliberately presents only three destinations. The detailed
 * lifecycle remains in the card badge; this mapping only determines where an
 * authoritative backend booking is grouped.
 */
export function getCustomerTripsPrimaryTab(
  booking: RenterBooking,
): CustomerTripsPrimaryTab {
  if (
    booking.statusPresentation.lifecycle === 'payment_expired' ||
    booking.statusPresentation.lifecycle === 'payment_failed' ||
    booking.statusPresentation.lifecycle === 'payment_cancelled' ||
    booking.tripPhase === 'cancelled' ||
    booking.status === 'cancelled' ||
    booking.status === 'failed' ||
    booking.status === 'expired' ||
    booking.paymentStatus === 'failed' ||
    booking.paymentStatus === 'cancelled'
  ) {
    return 'cancelled';
  }

  if (
    booking.statusPresentation.lifecycle === 'completed' ||
    booking.tripPhase === 'completed' ||
    booking.status === 'completed'
  ) {
    return 'past';
  }

  if (booking.statusPresentation.timing === 'pickup_overdue') {
    return 'past';
  }

  // Active, return-pending, and disputed bookings remain in Upcoming because
  // the customer may still need to complete a return or work with support.
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

  return 'upcoming';
}
