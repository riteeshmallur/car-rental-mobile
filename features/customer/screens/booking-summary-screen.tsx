import { useMutation } from '@tanstack/react-query';
import { type Href, router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, CalendarClock, MapPin } from 'lucide-react-native';
import { type ReactNode, useEffect, useMemo, useRef } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  formatMoney,
  getCarImageUrl,
} from '@/features/customer/utils/car-formatters';
import { quotesApi } from '@/services/quotes/quotes-api';
import { useSafeBack } from '@/hooks/use-safe-back';
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

export function BookingSummaryScreen() {
  const params = useLocalSearchParams<{
    vehicleId?: string;
    locationId?: string;
    origin?: string;
    pickupDateTime?: string;
    returnDateTime?: string;
  }>();
  const vehicleId = getParam(params.vehicleId);
  const locationId = getParam(params.locationId);
  const origin = getParam(params.origin);
  const pickupDateTime = getParam(params.pickupDateTime);
  const returnDateTime = getParam(params.returnDateTime);
  const setQuote = useBookingFlowStore((state) => state.setQuote);
  const quote = useBookingFlowStore((state) => state.quote);
  const didRequestQuote = useRef(false);
  const backFallback = useMemo<Href>(() => {
    if (!vehicleId) {
      return '/(customer)/home';
    }

    return {
      pathname: '/(customer)/vehicles/[id]',
      params: {
        id: vehicleId,
        locationId: locationId ?? '',
        origin: origin ?? 'home',
        pickupDateTime: pickupDateTime ?? '',
        returnDateTime: returnDateTime ?? '',
      },
    };
  }, [locationId, origin, pickupDateTime, returnDateTime, vehicleId]);
  const currentQuote =
    quote &&
    quote.carId === vehicleId &&
    quote.pickupAt === pickupDateTime &&
    quote.returnAt === returnDateTime &&
    Date.parse(quote.expiresAt) > Date.now()
      ? quote
      : null;

  const quoteMutation = useMutation({
    mutationFn: () =>
      quotesApi.create({
        carId: vehicleId ?? '',
        pickupAt: pickupDateTime ?? '',
        returnAt: returnDateTime ?? '',
      }),
    onSuccess: setQuote,
  });

  useEffect(() => {
    if (!vehicleId || !pickupDateTime || !returnDateTime || didRequestQuote.current) {
      return;
    }

    didRequestQuote.current = true;
    setQuote(null);
    quoteMutation.mutate();
  }, [pickupDateTime, quoteMutation, returnDateTime, setQuote, vehicleId]);

  const retryQuote = () => {
    didRequestQuote.current = true;
    setQuote(null);
    quoteMutation.mutate();
  };

  if (!vehicleId || !pickupDateTime || !returnDateTime) {
    return (
      <BookingShell fallback={backFallback} title="Booking summary">
        <StateMessage
          body="Return to vehicle details and continue with selected rental dates."
          title="Booking details missing"
        />
      </BookingShell>
    );
  }

  return (
    <BookingShell fallback={backFallback} title="Booking summary">
      {quoteMutation.isPending && !currentQuote ? (
        <View style={styles.centerState}>
          <ActivityIndicator color="#111827" />
          <Text style={styles.mutedText}>Preparing your quote</Text>
        </View>
      ) : quoteMutation.isError ? (
        <StateMessage
          actionLabel="Retry quote"
          body="The vehicle may no longer be available, or the quote service could not be reached."
          onAction={retryQuote}
          title="Quote failed"
        />
      ) : currentQuote ? (
        <ScrollView contentContainerStyle={styles.content}>
          <View style={styles.vehicleRow}>
            {currentQuote.vehicle.imageUrl ? (
              <Image
                source={{ uri: getCarImageUrl(currentQuote.vehicle.imageUrl) ?? '' }}
                style={styles.vehicleImage}
              />
            ) : (
              <View style={styles.vehicleImageFallback}>
                <Text style={styles.vehicleInitial}>
                  {currentQuote.vehicle.make.slice(0, 1)}
                </Text>
              </View>
            )}
            <View style={styles.vehicleCopy}>
              <Text style={styles.vehicleTitle}>
                {currentQuote.vehicle.make} {currentQuote.vehicle.model}
              </Text>
              <View style={styles.inlineRow}>
                <MapPin color="#6B7280" size={15} />
                <Text numberOfLines={1} style={styles.mutedText}>
                  {currentQuote.vehicle.locationName ?? 'Pickup location'}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rental window</Text>
            <View style={styles.tripRow}>
              <CalendarClock color="#111827" size={18} />
              <View style={styles.tripCopy}>
                <Text style={styles.bodyText}>{formatDateTime(pickupDateTime)}</Text>
                <Text style={styles.bodyText}>{formatDateTime(returnDateTime)}</Text>
                <Text style={styles.mutedText}>{currentQuote.rentalDays} day rental</Text>
              </View>
            </View>
          </View>

          <PriceRows
            rows={[
              ['Base price', currentQuote.basePrice],
              ['Service fee', currentQuote.serviceFee],
              ['Taxes', currentQuote.taxes],
              ['Security deposit', currentQuote.securityDeposit],
              ['Discounts', currentQuote.discounts],
            ]}
            total={currentQuote.totalAmount}
          />

          <Pressable
            accessibilityRole="button"
            onPress={() =>
              router.push({
                pathname: '/(customer)/booking/breakdown',
                params: {
                  vehicleId,
                  locationId: locationId ?? '',
                  origin: origin ?? 'home',
                  pickupDateTime,
                  returnDateTime,
                },
              })
            }
            style={styles.primaryButton}
          >
            <Text style={styles.primaryButtonText}>Continue</Text>
          </Pressable>
        </ScrollView>
      ) : null}
    </BookingShell>
  );
}

export function BookingShell({
  children,
  fallback,
  onBeforeBack,
  preferFallback,
  title,
}: {
  children: ReactNode;
  fallback: Href;
  onBeforeBack?: () => boolean | void;
  preferFallback?: boolean;
  title: string;
}) {
  const goBack = useSafeBack({ fallback, onBeforeBack, preferFallback });

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={goBack}
          style={styles.backButton}
        >
          <ArrowLeft color="#111827" size={22} />
        </Pressable>
        <Text style={styles.headerTitle}>{title}</Text>
      </View>
      {children}
    </SafeAreaView>
  );
}

export function PriceRows({
  rows,
  total,
}: {
  rows: Array<[string, string]>;
  total: string;
}) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>Price breakdown</Text>
      {rows.map(([label, value]) => (
        <View key={label} style={styles.priceRow}>
          <Text style={styles.mutedText}>{label}</Text>
          <Text style={styles.bodyText}>{formatMoney(value)}</Text>
        </View>
      ))}
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Total</Text>
        <Text style={styles.totalAmount}>{formatMoney(total)}</Text>
      </View>
    </View>
  );
}

export function StateMessage({
  actionLabel,
  body,
  onAction,
  title,
}: {
  actionLabel?: string;
  body: string;
  onAction?: () => void;
  title: string;
}) {
  return (
    <View style={styles.centerState}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={styles.secondaryButton}
        >
          <Text style={styles.secondaryButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7FAFF',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 18,
    backgroundColor: '#F7FAFF',
  },
  backButton: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
  },
  content: {
    gap: 16,
    padding: 18,
    paddingBottom: 32,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
  },
  vehicleRow: {
    flexDirection: 'row',
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  vehicleImage: {
    height: 82,
    width: 96,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  vehicleImageFallback: {
    height: 82,
    width: 96,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#EAF2FF',
  },
  vehicleInitial: {
    color: '#0F172A',
    fontSize: 34,
    fontWeight: '900',
  },
  vehicleCopy: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  vehicleTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  section: {
    gap: 12,
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
  tripRow: {
    flexDirection: 'row',
    gap: 10,
  },
  tripCopy: {
    flex: 1,
    gap: 3,
  },
  priceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
    paddingTop: 12,
  },
  bodyText: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '800',
  },
  mutedText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
  },
  totalLabel: {
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  totalAmount: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
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
  secondaryButton: {
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0B4FE8',
    paddingHorizontal: 18,
    marginTop: 4,
  },
  secondaryButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  stateTitle: {
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
    textAlign: 'center',
  },
  stateBody: {
    color: '#6B7280',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    textAlign: 'center',
  },
});
