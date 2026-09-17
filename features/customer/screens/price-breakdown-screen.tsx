import { type Href, router, useLocalSearchParams } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  BookingShell,
  PriceRows,
  StateMessage,
} from '@/features/customer/screens/booking-summary-screen';
import { useBookingFlowStore } from '@/store/booking-flow-store';

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function PriceBreakdownScreen() {
  const params = useLocalSearchParams<{
    locationId?: string;
    origin?: string;
  }>();
  const locationId = getParam(params.locationId);
  const origin = getParam(params.origin);
  const quote = useBookingFlowStore((state) => state.quote);
  const backFallback: Href = quote
    ? {
        pathname: '/(customer)/booking/summary',
        params: {
          vehicleId: quote.carId,
          locationId: locationId ?? '',
          origin: origin ?? 'home',
          pickupDateTime: quote.pickupAt,
          returnDateTime: quote.returnAt,
        },
      }
    : '/(customer)/home';

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
        <Pressable
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/(customer)/booking/payment',
              params: {
                locationId: locationId ?? '',
                origin: origin ?? 'home',
              },
            })
          }
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Continue to payment</Text>
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
});
