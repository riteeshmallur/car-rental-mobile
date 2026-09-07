import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CheckCircle2 } from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  BookingShell,
  StateMessage,
} from '@/features/customer/screens/booking-summary-screen';
import { formatMoney } from '@/features/customer/utils/car-formatters';
import { bookingsApi } from '@/services/bookings/bookings-api';
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
  const storedBooking = useBookingFlowStore((state) => state.booking);
  const clearBookingFlow = useBookingFlowStore((state) => state.clear);

  const bookingQuery = useQuery({
    enabled: Boolean(bookingId && !storedBooking),
    queryKey: ['bookings', bookingId],
    queryFn: () => bookingsApi.findById(bookingId ?? ''),
  });

  const booking = storedBooking ?? bookingQuery.data;

  return (
    <BookingShell title="Booking confirmation">
      {!bookingId ? (
        <StateMessage
          body="The booking reference is missing."
          title="Booking not found"
        />
      ) : bookingQuery.isError ? (
        <StateMessage
          actionLabel="Retry"
          body="The backend could not load this booking."
          onAction={() => void bookingQuery.refetch()}
          title="Booking not found"
        />
      ) : booking ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.successCard}>
            <CheckCircle2 color="#047857" size={46} />
            <Text style={styles.title}>Booking created</Text>
            <Text style={styles.body}>
              Status: {booking.status.replace('_', ' ')}
            </Text>
            <Text style={styles.body}>
              Payment: {booking.paymentStatus.replace('_', ' ')}
            </Text>
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
            onPress={() => {
              clearBookingFlow();
              router.replace('/(customer)/trips');
            }}
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>View trips</Text>
          </Pressable>
        </ScrollView>
      ) : (
        <StateMessage body="Loading booking details." title="Please wait" />
      )}
    </BookingShell>
  );
}

const styles = StyleSheet.create({
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
    backgroundColor: '#111827',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});
