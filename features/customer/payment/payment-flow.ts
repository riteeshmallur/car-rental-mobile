import { type Booking, type BookingPayment } from '@/types/car';

export type PaymentScreenState =
  | 'initiate'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'processing'
  | 'confirmed'
  | 'unexpected_booking_status';

function normalizedStatus(value: string | null | undefined) {
  return value?.trim().toUpperCase().replace(/-/g, '_') ?? '';
}

export function isPendingPaymentBooking(
  booking: Pick<Booking, 'status'> | null | undefined,
) {
  return normalizedStatus(booking?.status) === 'PENDING_PAYMENT';
}

/**
 * The backend remains the authority for a payment deadline. When it has not
 * provided a separate deadline, never allow a new payment attempt after the
 * rental has started. This prevents an expired booking from being revived by
 * a stale payment screen.
 */
export function isPaymentWindowOpen(
  booking: Pick<Booking, 'pickupAt' | 'status'> | null | undefined,
  now = new Date(),
) {
  if (!isPendingPaymentBooking(booking)) {
    return false;
  }

  const pickupAt = Date.parse(booking?.pickupAt ?? '');
  return !Number.isFinite(pickupAt) || pickupAt > now.getTime();
}

export function isConfirmedPaidBooking(
  booking: Pick<Booking, 'status'> | null | undefined,
  payment: BookingPayment | null | undefined,
) {
  return normalizedStatus(booking?.status) === 'CONFIRMED' && normalizedStatus(payment?.status) === 'PAID';
}

export function getPaymentScreenState(
  booking: Pick<Booking, 'pickupAt' | 'status'> | null | undefined,
  payment: BookingPayment | null | undefined,
  now = new Date(),
): PaymentScreenState {
  if (isConfirmedPaidBooking(booking, payment)) {
    return 'confirmed';
  }

  const bookingStatus = normalizedStatus(booking?.status);
  const paymentStatus = normalizedStatus(payment?.status);
  if (
    bookingStatus === 'EXPIRED' ||
    paymentStatus === 'EXPIRED' ||
    (isPendingPaymentBooking(booking) && !isPaymentWindowOpen(booking, now))
  ) {
    return 'expired';
  }
  if (paymentStatus === 'FAILED') {
    return 'failed';
  }
  if (paymentStatus === 'CANCELLED' || paymentStatus === 'CANCELED') {
    return 'cancelled';
  }
  if (paymentStatus) {
    return 'processing';
  }

  return isPendingPaymentBooking(booking) ? 'initiate' : 'unexpected_booking_status';
}

export function shouldPollPayment(
  booking: Booking | null | undefined,
  payment: BookingPayment | null | undefined,
) {
  if (!isPendingPaymentBooking(booking)) {
    return false;
  }

  return ['PENDING', 'PROCESSING', 'REQUIRES_ACTION', 'AUTHORIZED', 'PAID'].includes(
    normalizedStatus(payment?.status),
  );
}
