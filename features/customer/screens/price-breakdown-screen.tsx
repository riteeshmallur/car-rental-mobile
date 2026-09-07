import { router } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import {
  BookingShell,
  PriceRows,
  StateMessage,
} from '@/features/customer/screens/booking-summary-screen';
import { useBookingFlowStore } from '@/store/booking-flow-store';

export function PriceBreakdownScreen() {
  const quote = useBookingFlowStore((state) => state.quote);

  if (!quote) {
    return (
      <BookingShell title="Price breakdown">
        <StateMessage
          body="Create a fresh quote from the vehicle details screen."
          title="Quote unavailable"
        />
      </BookingShell>
    );
  }

  return (
    <BookingShell title="Price breakdown">
      <ScrollView contentContainerStyle={styles.content}>
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
          onPress={() => router.push('/(customer)/booking/payment')}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Continue to payment</Text>
        </Pressable>
      </ScrollView>
    </BookingShell>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: 16,
    padding: 18,
  },
  notice: {
    gap: 5,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
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
    backgroundColor: '#111827',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});
