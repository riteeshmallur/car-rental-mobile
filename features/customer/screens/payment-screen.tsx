import { useMutation } from '@tanstack/react-query';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { CreditCard, ShieldCheck } from 'lucide-react-native';
import { useRef } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  BookingShell,
  StateMessage,
} from '@/features/customer/screens/booking-summary-screen';
import { formatMoney } from '@/features/customer/utils/car-formatters';
import {
  readSearchRouteState,
  toSearchRouteParams,
} from '@/features/customer/utils/search-route-state';
import { bookingsApi } from '@/services/bookings/bookings-api';
import { useBookingFlowStore } from '@/store/booking-flow-store';

function createIdempotencyKey() {
  return `booking-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function PaymentScreen() {
  const params = useLocalSearchParams();
  const searchRouteState = readSearchRouteState(params);
  const origin = getParam(params.origin);
  const quote = useBookingFlowStore((state) => state.quote);
  const setBooking = useBookingFlowStore((state) => state.setBooking);
  const idempotencyKeyRef = useRef(createIdempotencyKey());
  const backFallback: Href = quote
    ? {
        pathname: '/(customer)/booking/breakdown',
        params: {
          origin: origin ?? 'home',
          ...toSearchRouteParams(searchRouteState),
        },
      }
    : '/(customer)/home';

  const bookingMutation = useMutation({
    mutationFn: () => {
      if (!quote) {
        throw new Error('Quote unavailable');
      }

      return bookingsApi.create({
        carId: quote.carId,
        quoteId: quote.id,
        pickupAt: quote.pickupAt,
        returnAt: quote.returnAt,
        idempotencyKey: idempotencyKeyRef.current,
      });
    },
    onSuccess: (booking) => {
      setBooking(booking);
      router.replace({
        pathname: '/(customer)/booking/confirmation',
        params: { bookingId: booking.id },
      });
    },
  });

  if (!quote) {
    return (
      <BookingShell fallback={backFallback} title="Payment">
        <StateMessage
          body="Create a fresh quote before continuing to payment."
          title="Quote unavailable"
        />
      </BookingShell>
    );
  }

  return (
    <BookingShell fallback={backFallback} title="Payment">
      <ScrollView contentContainerStyle={styles.content} style={styles.scroll}>
        <View style={styles.paymentCard}>
          <View style={styles.iconFrame}>
            <CreditCard color="#111827" size={28} />
          </View>
          <Text style={styles.title}>Payment setup</Text>
          <Text style={styles.body}>
            No payment provider API is present in this backend yet. HopIn will
            create the booking with a server-side pending payment status.
          </Text>
        </View>

        <View style={styles.summary}>
          <Text style={styles.summaryLabel}>Amount due</Text>
          <Text style={styles.amount}>{formatMoney(quote.totalAmount)}</Text>
          <View style={styles.secureRow}>
            <ShieldCheck color="#047857" size={17} />
            <Text style={styles.secureText}>Quote expires at {new Date(quote.expiresAt).toLocaleTimeString()}</Text>
          </View>
        </View>

        {bookingMutation.isError ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorTitle}>Payment could not continue</Text>
            <Text style={styles.errorText}>
              The quote may have expired or the vehicle may no longer be available.
            </Text>
          </View>
        ) : null}

        <Pressable
          accessibilityRole="button"
          disabled={bookingMutation.isPending}
          onPress={() => bookingMutation.mutate()}
          style={({ pressed }) => [
            styles.primaryButton,
            bookingMutation.isPending && styles.disabledButton,
            pressed && styles.pressed,
          ]}
        >
          {bookingMutation.isPending ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.primaryButtonText}>Create booking</Text>
          )}
        </Pressable>
      </ScrollView>
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
  paymentCard: {
    alignItems: 'center',
    gap: 10,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 18,
  },
  iconFrame: {
    height: 58,
    width: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#EAF2FF',
  },
  title: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
  },
  body: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 21,
    textAlign: 'center',
  },
  summary: {
    gap: 6,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  summaryLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '800',
  },
  amount: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '900',
  },
  secureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  secureText: {
    color: '#047857',
    fontSize: 13,
    fontWeight: '800',
  },
  errorBox: {
    gap: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    padding: 14,
  },
  errorTitle: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '900',
  },
  errorText: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 19,
  },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0B4FE8',
  },
  disabledButton: {
    backgroundColor: '#6B7280',
  },
  pressed: {
    opacity: 0.8,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});
