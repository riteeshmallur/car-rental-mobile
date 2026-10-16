import { type Booking, type BookingPayment } from '@/types/car';

export type PaymentScreenState =
  | 'initiate'
  | 'failed'
  | 'cancelled'
  | 'processing'
  | 'confirmed'
  | 'unexpected_booking_status';

function normalizedStatus(value: string | null | undefined) {
  return value?.trim().toUpperCase().replace(/-/g, '_') ?? '';
}

export function isPendingPaymentBooking(booking: Booking | null | undefined) {
  return normalizedStatus(booking?.status) === 'PENDING_PAYMENT';
}

export function isConfirmedPaidBooking(
  booking: Booking | null | undefined,
  payment: BookingPayment | null | undefined,
) {
  return normalizedStatus(booking?.status) === 'CONFIRMED' && normalizedStatus(payment?.status) === 'PAID';
}

export function getPaymentScreenState(
  booking: Booking | null | undefined,
  payment: BookingPayment | null | undefined,
): PaymentScreenState {
  if (isConfirmedPaidBooking(booking, payment)) {
    return 'confirmed';
  }

  const paymentStatus = normalizedStatus(payment?.status);
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
