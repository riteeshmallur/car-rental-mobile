import { useMutation } from '@tanstack/react-query';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { useRef, useState } from 'react';

import {
  BookingShell,
  PriceRows,
  StateMessage,
} from '@/features/customer/screens/booking-summary-screen';
import {
  readSearchRouteState,
  toSearchRouteParams,
} from '@/features/customer/utils/search-route-state';
import { isPendingPaymentBooking } from '@/features/customer/payment/payment-flow';
import { bookingsApi } from '@/services/bookings/bookings-api';
import { useBookingFlowStore } from '@/store/booking-flow-store';

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function createIdempotencyKey() {
  return `booking-${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

export function PriceBreakdownScreen() {
  const params = useLocalSearchParams();
  const searchRouteState = readSearchRouteState(params);
  const origin = getParam(params.origin);
  const quote = useBookingFlowStore((state) => state.quote);
  const setBooking = useBookingFlowStore((state) => state.setBooking);
  const bookingCreationStarted = useRef(false);
  const bookingIdempotencyKey = useRef(createIdempotencyKey());
  const [unexpectedBookingStatus, setUnexpectedBookingStatus] = useState(false);
  const backFallback: Href = quote
    ? {
        pathname: '/(customer)/booking/summary',
        params: {
          vehicleId: quote.carId,
          origin: origin ?? 'home',
          ...toSearchRouteParams({
            ...searchRouteState,
            pickupDateTime: quote.pickupAt,
            returnDateTime: quote.returnAt,
          }),
        },
      }
    : '/(customer)/home';

  const bookingMutation = useMutation({
    mutationFn: () => {
      if (!quote) {
        throw new Error('Quote unavailable');
      }

      return bookingsApi.create({
        idempotencyKey: bookingIdempotencyKey.current,
        quoteId: quote.id,
      });
    },
    onSuccess: (booking) => {
      setBooking(booking);
      if (!isPendingPaymentBooking(booking)) {
        setUnexpectedBookingStatus(true);
        return;
      }
      router.replace({
        pathname: '/(customer)/booking/payment',
        params: { bookingId: booking.id, origin: origin ?? 'home' },
      });
    },
    onSettled: () => {
      bookingCreationStarted.current = false;
    },
  });

  if (!quote) {
    return (
      <BookingShell fallback={backFallback} title="Price breakdown">
        <StateMessage
          body="Create a fresh quote from the vehicle details screen."
          title="Quote unavailable"
        />
      </BookingShell>
    );
  }

  const beginPayment = () => {
    if (bookingCreationStarted.current || bookingMutation.isPending) {
      return;
    }
    bookingCreationStarted.current = true;
    setUnexpectedBookingStatus(false);
    bookingMutation.mutate();
  };

  return (
    <BookingShell fallback={backFallback} title="Price breakdown">
      <ScrollView contentContainerStyle={styles.content} style={styles.scroll}>
        <View style={styles.notice}>
          <Text style={styles.noticeTitle}>Server calculated quote</Text>
          <Text style={styles.noticeBody}>
            Prices, taxes, discounts, and booking status are finalized by HopIn.
          </Text>
        </View>
        <PriceRows
          rows={[
            ['Base price', quote.basePrice],
            ['Service fee', quote.serviceFee],
            ['Taxes', quote.taxes],
            ['Security deposit', quote.securityDeposit],
            ['Discounts', quote.discounts],
          ]}
          total={quote.totalAmount}
        />
        {bookingMutation.isError || unexpectedBookingStatus ? (
          <View style={styles.errorBox}>
            <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.errorTitle}>
              {unexpectedBookingStatus ? 'Booking is not ready for payment' : 'Booking could not be created'}
            </Text>
            <Text accessibilityLiveRegion="assertive" style={styles.errorText}>
              {unexpectedBookingStatus
                ? 'Refresh your quote and try again.'
                : 'Check your connection and retry. Your quote total remains server calculated.'}
            </Text>
          </View>
        ) : null}
        <Pressable
          accessibilityLabel={bookingMutation.isPending ? 'Creating booking' : 'Continue to payment'}
          accessibilityRole="button"
          accessibilityState={{ busy: bookingMutation.isPending, disabled: bookingMutation.isPending }}
          disabled={bookingMutation.isPending}
          onPress={beginPayment}
          style={[styles.primaryButton, bookingMutation.isPending && styles.disabledButton]}
          testID="quote-continue"
        >
          {bookingMutation.isPending ? <ActivityIndicator accessibilityLabel="Creating booking" color="#FFFFFF" /> : <Text style={styles.primaryButtonText}>Continue to payment</Text>}
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
  notice: {
    gap: 5,
    borderRadius: 8,
    backgroundColor: '#EAF2FF',
    padding: 14,
  },
  noticeTitle: {
    color: '#1E40AF',
    fontSize: 15,
    fontWeight: '900',
  },
  noticeBody: {
    color: '#1D4ED8',
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
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
  disabledButton: {
    backgroundColor: '#6B7280',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
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
});
