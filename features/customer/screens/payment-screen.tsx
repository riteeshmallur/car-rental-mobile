import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { type Href, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { CircleAlert, CreditCard, LoaderCircle, RefreshCw, ShieldCheck } from 'lucide-react-native';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  AppState,
  type AppStateStatus,
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  getPaymentScreenState,
  isConfirmedPaidBooking,
  shouldPollPayment,
} from '@/features/customer/payment/payment-flow';
import {
  openRazorpayCheckout,
  type RazorpayCheckoutResult,
} from '@/features/customer/payment/razorpay-checkout';
import { BookingShell, StateMessage } from '@/features/customer/screens/booking-summary-screen';
import { formatMoney } from '@/features/customer/utils/car-formatters';
import { bookingsApi } from '@/services/bookings/bookings-api';
import { useBookingFlowStore } from '@/store/booking-flow-store';
import { normalizeApiError } from '@/utils/errors';

const paymentPollingInterval = 3_000;

function createIdempotencyKey(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function PaymentScreen() {
  const params = useLocalSearchParams<{ bookingId?: string | string[]; origin?: string | string[] }>();
  const bookingId = getParam(params.bookingId);
  const queryClient = useQueryClient();
  const setBooking = useBookingFlowStore((state) => state.setBooking);
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === 'active');
  const [isScreenFocused, setIsScreenFocused] = useState(true);
  const [hasPaymentAttempt, setHasPaymentAttempt] = useState(false);
  const paymentSubmissionStarted = useRef(false);
  const paymentAttemptKeyRef = useRef(createIdempotencyKey('payment'));
  const paymentRetryKeyRef = useRef(createIdempotencyKey('payment-retry'));
  const isScreenActive = useRef(true);
  const didNavigateToConfirmation = useRef(false);
  const backFallback: Href = bookingId
    ? { pathname: '/(customer)/booking/breakdown', params: { origin: getParam(params.origin) ?? 'home' } }
    : '/(customer)/home';

  const bookingQuery = useQuery({
    enabled: Boolean(bookingId),
    queryKey: ['bookings', bookingId],
    queryFn: () => bookingsApi.findById(bookingId ?? ''),
    retry: false,
  });
  const paymentQuery = useQuery({
    // A freshly created booking has no payment record yet. Do not issue an
    // expected-to-fail lookup before the customer submits their first attempt.
    enabled: Boolean(bookingQuery.data?.id && hasPaymentAttempt),
    queryKey: ['bookings', 'payment', bookingId],
    queryFn: () => bookingsApi.findPayment(bookingId ?? ''),
    refetchInterval: (query) =>
      isAppActive && isScreenFocused && shouldPollPayment(bookingQuery.data, query.state.data)
        ? paymentPollingInterval
        : false,
    retry: false,
  });

  const refreshPaymentState = useCallback(async (includePayment = hasPaymentAttempt) => {
    if (!bookingId) {
      return;
    }

    const refreshes: Array<Promise<unknown>> = [
      bookingQuery.refetch(),
      queryClient.invalidateQueries({ queryKey: ['renters', 'me', 'bookings'] }),
    ];

    if (includePayment) {
      refreshes.push(paymentQuery.refetch());
    }

    await Promise.all(refreshes);
  }, [bookingId, bookingQuery, hasPaymentAttempt, paymentQuery, queryClient]);

  const createPaymentMutation = useMutation({
    mutationFn: async () => {
      if (!bookingId) {
        throw new Error('Booking reference is missing.');
      }

      const payment = await bookingsApi.createPayment(bookingId, {
        idempotencyKey: paymentAttemptKeyRef.current,
      });
      return confirmRazorpayCheckout(payment, bookingId);
    },
    onSuccess: async () => {
      setHasPaymentAttempt(true);
      await refreshPaymentState(true);
    },
    onError: () => {
      setHasPaymentAttempt(true);
      void refreshPaymentState(true);
    },
    onSettled: () => {
      paymentSubmissionStarted.current = false;
    },
  });
  const retryPaymentMutation = useMutation({
    mutationFn: async (paymentId: string) => {
      if (!bookingId) {
        throw new Error('Booking reference is missing.');
      }
      const payment = await bookingsApi.retryPayment(paymentId, {
        idempotencyKey: paymentRetryKeyRef.current,
      });
      return confirmRazorpayCheckout(payment, bookingId);
    },
    onSuccess: async () => {
      // Retain a key on a transient network error, but rotate it after a completed attempt.
      paymentRetryKeyRef.current = createIdempotencyKey('payment-retry');
      setHasPaymentAttempt(true);
      await refreshPaymentState(true);
    },
    onError: () => {
      setHasPaymentAttempt(true);
      void refreshPaymentState(true);
    },
    onSettled: () => {
      paymentSubmissionStarted.current = false;
    },
  });

  const checkoutMutation = useMutation({
    mutationFn: (payment: Awaited<ReturnType<typeof bookingsApi.findPayment>>) => {
      if (!bookingId) {
        throw new Error('Booking reference is missing.');
      }
      return confirmRazorpayCheckout(payment, bookingId);
    },
    onSuccess: async () => {
      setHasPaymentAttempt(true);
      await refreshPaymentState(true);
    },
  });

  const isSubmitting =
    createPaymentMutation.isPending ||
    retryPaymentMutation.isPending ||
    checkoutMutation.isPending;
  const booking = bookingQuery.data;
  const payment = paymentQuery.data;
  const paymentState = getPaymentScreenState(booking, payment);
  const amount = booking ? formatMoney(payment?.amount ?? booking.totalPrice) : '';

  const submitPayment = useCallback(() => {
    if (paymentSubmissionStarted.current || createPaymentMutation.isPending) {
      return;
    }

    paymentSubmissionStarted.current = true;
    createPaymentMutation.mutate();
  }, [createPaymentMutation]);

  const retryPayment = useCallback(() => {
    if (!payment || paymentSubmissionStarted.current || retryPaymentMutation.isPending) {
      return;
    }

    paymentSubmissionStarted.current = true;
    retryPaymentMutation.mutate(payment.id);
  }, [payment, retryPaymentMutation]);

  useFocusEffect(
    useCallback(() => {
      isScreenActive.current = true;
      setIsScreenFocused(true);
      return () => {
        isScreenActive.current = false;
        setIsScreenFocused(false);
      };
    }, []),
  );

  useEffect(() => {
    const onAppStateChange = (nextState: AppStateStatus) => {
      const active = nextState === 'active';
      setIsAppActive(active);
      if (active) {
        void refreshPaymentState();
      }
    };
    const subscription = AppState.addEventListener('change', onAppStateChange);
    return () => subscription.remove();
  }, [refreshPaymentState]);

  useEffect(() => {
    if (
      !bookingId ||
      didNavigateToConfirmation.current ||
      !isScreenActive.current ||
      !booking ||
      !isConfirmedPaidBooking(booking, payment)
    ) {
      return;
    }

    didNavigateToConfirmation.current = true;
    setBooking(booking);
    router.replace({
      pathname: '/(customer)/booking/confirmation',
      params: { bookingId },
    });
  }, [booking, bookingId, payment, setBooking]);

  if (!bookingId) {
    return (
      <BookingShell fallback={backFallback} title="Payment">
        <StateMessage body="Return to the booking summary and create a booking first." title="Booking not found" />
      </BookingShell>
    );
  }

  if (bookingQuery.isPending || (hasPaymentAttempt && bookingQuery.isSuccess && paymentQuery.isPending)) {
    return (
      <BookingShell fallback={backFallback} title="Payment">
        <LoadingPaymentState />
      </BookingShell>
    );
  }

  if (bookingQuery.isError || !booking) {
    return (
      <BookingShell fallback={backFallback} title="Payment">
        <StateMessage
          actionLabel="Retry"
          body={bookingQuery.isError ? normalizeApiError(bookingQuery.error).message : 'The booking could not be loaded.'}
          onAction={() => void bookingQuery.refetch()}
          title="Payment could not load"
        />
      </BookingShell>
    );
  }

  if (hasPaymentAttempt && paymentQuery.isError) {
    return (
      <BookingShell fallback={backFallback} title="Payment">
        <StateMessage
          actionLabel="Retry"
          body={normalizeApiError(paymentQuery.error).message}
          onAction={() => void refreshPaymentState()}
          title="Payment status could not load"
        />
      </BookingShell>
    );
  }

  if (paymentState === 'confirmed') {
    return (
      <BookingShell fallback={backFallback} title="Payment">
        <LoadingPaymentState label="Payment received. Opening your booking confirmation." />
      </BookingShell>
    );
  }

  return (
    <BookingShell fallback={backFallback} title="Payment">
      <ScrollView contentContainerStyle={styles.content} style={styles.scroll}>
        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Amount due</Text>
          <Text style={styles.amount}>{amount}</Text>
          <View style={styles.secureRow}>
            <ShieldCheck color="#047857" size={17} />
            <Text style={styles.secureText}>Amount supplied by your booking</Text>
          </View>
        </View>

        {paymentState === 'initiate' ? (
          <PaymentAction
            actionLabel="Pay now"
            description="Your booking is held while payment is completed."
            disabled={isSubmitting}
            error={createPaymentMutation.isError ? normalizeApiError(createPaymentMutation.error).message : null}
            onPress={submitPayment}
            title="Complete payment"
          />
        ) : null}

        {paymentState === 'failed' ? (
          <PaymentAction
            actionLabel="Retry Payment"
            description={payment?.failureMessage ?? 'The payment was not completed. You can safely try again.'}
            disabled={isSubmitting}
            error={retryPaymentMutation.isError ? normalizeApiError(retryPaymentMutation.error).message : null}
            onPress={retryPayment}
            title="Payment failed"
            tone="error"
          />
        ) : null}

        {paymentState === 'cancelled' ? (
          <PaymentAction
            actionLabel="Try Again"
            description="The payment was cancelled before it completed."
            disabled={isSubmitting}
            error={retryPaymentMutation.isError ? normalizeApiError(retryPaymentMutation.error).message : null}
            onPress={retryPayment}
            title="Payment cancelled"
            tone="error"
          />
        ) : null}

        {paymentState === 'processing' ? (
          payment?.provider === 'razorpay' && payment.checkout ? (
            <PaymentAction
              actionLabel="Open Razorpay Checkout"
              description="Complete payment in Razorpay Checkout. Your booking remains pending until the backend verifies it."
              disabled={isSubmitting}
              error={checkoutMutation.isError ? normalizeApiError(checkoutMutation.error).message : null}
              onPress={() => checkoutMutation.mutate(payment)}
              title="Complete payment"
            />
          ) : (
            <PaymentProcessingState
              amount={amount}
              isRefreshing={paymentQuery.isFetching || bookingQuery.isFetching}
              onRefresh={() => void refreshPaymentState()}
            />
          )
        ) : null}

        {paymentState === 'unexpected_booking_status' ? (
          <StateMessage
            actionLabel="Check status"
            body="This booking is not currently available for payment. Refresh its status before trying again."
            onAction={() => void refreshPaymentState()}
            title="Booking payment unavailable"
          />
        ) : null}
      </ScrollView>
    </BookingShell>
  );
}

async function confirmRazorpayCheckout(
  payment: Awaited<ReturnType<typeof bookingsApi.createPayment>>,
  bookingId: string,
) {
  if (payment.provider !== 'razorpay' || !payment.checkout) {
    return payment;
  }
  const result: RazorpayCheckoutResult = await openRazorpayCheckout({
    ...payment.checkout,
    bookingId,
  });
  return bookingsApi.confirmRazorpayPayment(payment.id, {
    razorpayOrderId: result.razorpay_order_id,
    razorpayPaymentId: result.razorpay_payment_id,
    razorpaySignature: result.razorpay_signature,
  });
}

function PaymentAction({
  actionLabel,
  description,
  disabled,
  error,
  onPress,
  title,
  tone = 'default',
}: {
  actionLabel: string;
  description: string;
  disabled: boolean;
  error: string | null;
  onPress: () => void;
  title: string;
  tone?: 'default' | 'error';
}) {
  return (
    <View style={[styles.paymentCard, tone === 'error' && styles.paymentCardError]}>
      <View style={[styles.iconFrame, tone === 'error' && styles.iconFrameError]}>
        {tone === 'error' ? <CircleAlert color="#B91C1C" size={28} /> : <CreditCard color="#102550" size={28} />}
      </View>
      <Text accessibilityRole="header" style={styles.title}>{title}</Text>
      <Text style={styles.body}>{description}</Text>
      {error ? (
        <View style={styles.errorBox}>
          <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <Pressable
        accessibilityLabel={disabled ? 'Submitting payment' : actionLabel}
        accessibilityRole="button"
        accessibilityState={{ busy: disabled, disabled }}
        disabled={disabled}
        onPress={onPress}
        style={[styles.primaryButton, disabled && styles.disabledButton]}
        testID="payment-submit"
      >
        {disabled ? <ActivityIndicator accessibilityLabel="Submitting payment" color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>{actionLabel}</Text>}
      </Pressable>
    </View>
  );
}

function PaymentProcessingState({
  amount,
  isRefreshing,
  onRefresh,
}: {
  amount: string;
  isRefreshing: boolean;
  onRefresh: () => void;
}) {
  return (
    <View style={styles.paymentCard}>
      <View style={styles.iconFrame}>
        <LoaderCircle color="#0B6FE8" size={28} />
      </View>
      <Text accessibilityLiveRegion="polite" accessibilityRole="header" style={styles.title}>Payment Processing</Text>
      <Text style={styles.body}>We are waiting for confirmation of {amount} from the payment provider.</Text>
      <Pressable
        accessibilityLabel="Check payment status"
        accessibilityRole="button"
        accessibilityState={{ busy: isRefreshing, disabled: isRefreshing }}
        disabled={isRefreshing}
        onPress={onRefresh}
        style={[styles.secondaryButton, isRefreshing && styles.disabledSecondaryButton]}
      >
        {isRefreshing ? <ActivityIndicator accessibilityLabel="Checking payment status" color="#0B6FE8" /> : <><RefreshCw color="#0B6FE8" size={18} /><Text style={styles.secondaryButtonText}>Check status</Text></>}
      </Pressable>
    </View>
  );
}

function LoadingPaymentState({ label = 'Checking booking and payment status.' }: { label?: string }) {
  return (
    <View style={styles.loadingState}>
      <ActivityIndicator color="#0B6FE8" />
      <Text style={styles.body}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  amount: { color: '#102550', fontSize: 28, fontWeight: '900' },
  body: { color: '#536B91', fontSize: 14, fontWeight: '700', lineHeight: 21, textAlign: 'center' },
  content: { gap: 16, padding: 18 },
  disabledButton: { backgroundColor: '#536B91' },
  disabledSecondaryButton: { opacity: 0.6 },
  errorBox: { backgroundColor: '#FEF2F2', borderColor: '#FECACA', borderRadius: 8, borderWidth: 1, padding: 12, width: '100%' },
  errorText: { color: '#B91C1C', fontSize: 13, fontWeight: '700', lineHeight: 19 },
  iconFrame: { alignItems: 'center', backgroundColor: '#EAF4FF', borderRadius: 8, height: 58, justifyContent: 'center', width: 58 },
  iconFrameError: { backgroundColor: '#FEE2E2' },
  loadingState: { alignItems: 'center', flex: 1, gap: 12, justifyContent: 'center', padding: 28 },
  paymentCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 12, borderWidth: 1, gap: 12, padding: 18 },
  paymentCardError: { borderColor: '#FECACA' },
  primaryButton: { alignItems: 'center', backgroundColor: '#0B6FE8', borderRadius: 8, justifyContent: 'center', minHeight: 52, width: '100%' },
  primaryButtonText: { color: '#FFFFFF', fontSize: 15, fontWeight: '900' },
  scroll: { flex: 1, minHeight: 0 },
  secondaryButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#BFDBFE', borderRadius: 8, borderWidth: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 48, paddingHorizontal: 16 },
  secondaryButtonText: { color: '#0B6FE8', fontSize: 14, fontWeight: '900' },
  secureRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  secureText: { color: '#047857', fontSize: 13, fontWeight: '800' },
  summary: { backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 12, borderWidth: 1, gap: 6, padding: 14 },
  summaryLabel: { color: '#536B91', fontSize: 13, fontWeight: '800' },
  title: { color: '#102550', fontSize: 20, fontWeight: '900', textAlign: 'center' },
});
