import { type Booking, type BookingPayment } from '@/types/car';
import { type TestPaymentScenario } from '@/types/payment';

export type { TestPaymentScenario } from '@/types/payment';

export const testPaymentScenarios: Array<{
  label: string;
  value: TestPaymentScenario;
}> = [
  { label: 'Successful Payment', value: 'SUCCESS' },
  { label: 'Failed Payment', value: 'FAILURE' },
  { label: 'Processing Payment', value: 'PROCESSING' },
  { label: 'Cancel Payment', value: 'CANCELLED' },
];

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

type PaymentBuildEnvironment = {
  appEnvironment?: string;
  enableTestPayment?: string;
  isDevelopment: boolean;
  nodeEnvironment?: string;
};

export function isDevelopmentTestPaymentEnabled(
  environment: PaymentBuildEnvironment = {
    appEnvironment: process.env.EXPO_PUBLIC_APP_ENV,
    enableTestPayment: process.env.EXPO_PUBLIC_ENABLE_TEST_PAYMENT,
    isDevelopment: __DEV__,
    nodeEnvironment: process.env.NODE_ENV,
  },
) {
  return (
    environment.isDevelopment ||
    environment.nodeEnvironment === 'test' ||
    (environment.appEnvironment === 'test' && environment.enableTestPayment === 'true')
  );
}
