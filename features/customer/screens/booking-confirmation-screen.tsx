import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { useCallback } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  BookingShell,
  StateMessage,
} from '@/features/customer/screens/booking-summary-screen';
import { isConfirmedPaidBooking } from '@/features/customer/payment/payment-flow';
import { formatMoney } from '@/features/customer/utils/car-formatters';
import { bookingsApi } from '@/services/bookings/bookings-api';
import { useWebBackGuard } from '@/hooks/use-web-back-guard';
import { useBookingFlowStore } from '@/store/booking-flow-store';

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

export function BookingConfirmationScreen() {
  const params = useLocalSearchParams<{ bookingId?: string }>();
  const bookingId = getParam(params.bookingId);
  const clearBookingFlow = useBookingFlowStore((state) => state.clear);
  const exitConfirmation = useCallback(() => {
    clearBookingFlow();
    router.replace('/(customer)/trips');
  }, [clearBookingFlow]);
  useWebBackGuard({
    active: true,
    onBack: exitConfirmation,
    pushEntry: false,
  });

  const bookingQuery = useQuery({
    enabled: Boolean(bookingId),
    queryKey: ['bookings', bookingId],
    queryFn: () => bookingsApi.findById(bookingId ?? ''),
    retry: false,
  });
  const paymentQuery = useQuery({
    enabled: Boolean(bookingQuery.data?.id),
    queryKey: ['bookings', 'payment', bookingId],
    queryFn: () => bookingsApi.findPayment(bookingId ?? ''),
    retry: false,
  });

  const booking = bookingQuery.data;

  return (
    <BookingShell
      fallback="/(customer)/trips"
      onBeforeBack={clearBookingFlow}
      preferFallback
      title="Booking confirmation"
    >
      {!bookingId ? (
        <StateMessage
          body="The booking reference is missing."
          title="Booking not found"
        />
      ) : bookingQuery.isError || paymentQuery.isError ? (
        <StateMessage
          actionLabel="Retry"
          body="The backend could not verify this booking and payment."
          onAction={() => {
            void bookingQuery.refetch();
            void paymentQuery.refetch();
          }}
          title="Booking not found"
        />
      ) : booking && paymentQuery.data && isConfirmedPaidBooking(booking, paymentQuery.data) ? (
        <ScrollView contentContainerStyle={styles.content} style={styles.scroll}>
          <View style={styles.successCard}>
            <CheckCircle2 color="#047857" size={46} />
            <Text style={styles.title}>Booking confirmed</Text>
            <Text style={styles.body}>
              Status: {booking.status.replace('_', ' ')}
            </Text>
            <Text style={styles.body}>Payment: {paymentQuery.data.status.replace('_', ' ')}</Text>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Trip details</Text>
            <Text style={styles.rowText}>Pickup: {formatDateTime(booking.pickupAt)}</Text>
            <Text style={styles.rowText}>Return: {formatDateTime(booking.returnAt)}</Text>
            <Text style={styles.rowText}>Total: {formatMoney(booking.totalPrice)}</Text>
            <Text selectable style={styles.reference}>
              {booking.id}
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={exitConfirmation}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>View trips</Text>
          </Pressable>
        </ScrollView>
      ) : booking ? (
        <StateMessage
          actionLabel="Return to payment"
          body="Booking confirmation is available after the backend confirms a paid payment."
          onAction={() => router.replace({ pathname: '/(customer)/booking/payment', params: { bookingId } })}
          title="Payment pending"
        />
      ) : (
        <StateMessage body="Loading booking details." title="Please wait" />
      )}
    </BookingShell>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  content: {
    gap: 16,
    padding: 18,
  },
  successCard: {
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: '#BBF7D0',
    borderRadius: 8,
    backgroundColor: '#F0FDF4',
    padding: 18,
  },
  title: {
    color: '#14532D',
    fontSize: 22,
    fontWeight: '900',
  },
  body: {
    color: '#166534',
    fontSize: 14,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  section: {
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
  },
  rowText: {
    color: '#374151',
    fontSize: 14,
    fontWeight: '800',
  },
  reference: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
  },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0B4FE8',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});
