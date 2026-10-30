import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarClock, CarFront } from 'lucide-react-native';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/features/customer/components/bottom-navigation';
import { CachedVehicleImage } from '@/features/customer/components/cached-vehicle-image';
import { formatMoney, getVehicleImageVariantUrl } from '@/features/customer/utils/car-formatters';
import { useSafeBack } from '@/hooks/use-safe-back';
import { bookingsApi } from '@/services/bookings/bookings-api';
import { type RenterBooking, type RenterTripPhase } from '@/types/car';
import { normalizeApiError } from '@/utils/errors';
import {
  getBookingTotal,
  getCustomerTripsPrimaryTab,
  getRenterTripStatusLabel,
  KOLKATA_TIME_ZONE,
  type CustomerTripsPrimaryTab,
} from '@/utils/booking-presentation';

type TripTab = { label: string; value: CustomerTripsPrimaryTab };

const tabs: TripTab[] = [
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Past', value: 'past' },
  { label: 'Cancelled', value: 'cancelled' },
];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone: KOLKATA_TIME_ZONE,
  }).format(new Date(value));
}

function titleCase(value: string | null | undefined) {
  return (value ?? 'Pending').replace(/_/g, ' ');
}

function locationLabel(booking: RenterBooking) {
  return [
    booking.pickupLocation.name,
    booking.pickupLocation.city,
    booking.pickupLocation.state,
  ]
    .filter(Boolean)
    .join(', ');
}

function resolveTripsTab(value: string | undefined): CustomerTripsPrimaryTab {
  if (value === 'past' || value === 'cancelled' || value === 'upcoming') {
    return value;
  }

  // Keep existing deep links useful while transitioning away from lifecycle tabs.
  if (value === 'completed' || value === 'disputed') {
    return 'past';
  }
  return 'upcoming';
}

export function TripsScreen() {
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const requestedTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const activeTab = resolveTripsTab(requestedTab);
  const [now, setNow] = useState(() => new Date());
  useSafeBack({ fallback: '/(customer)/home' });

  useEffect(() => {
    const clock = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(clock);
  }, []);

  const bookingsQuery = useQuery({
    queryKey: ['renters', 'me', 'bookings'],
    queryFn: bookingsApi.listRenterBookings,
    refetchOnMount: 'always',
    refetchOnReconnect: true,
    refetchInterval: 60_000,
    staleTime: 0,
  });

  const bookingsByTab = useMemo(() => {
    const grouped: Record<CustomerTripsPrimaryTab, RenterBooking[]> = {
      upcoming: [],
      past: [],
      cancelled: [],
    };

    for (const booking of bookingsQuery.data ?? []) {
      grouped[getCustomerTripsPrimaryTab(booking, now)].push(booking);
    }

    return grouped;
  }, [bookingsQuery.data, now]);

  const isRefreshing = bookingsQuery.isRefetching && !bookingsQuery.isLoading;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Customer</Text>
            <Text style={styles.title}>Trips</Text>
          </View>
        </View>

        <View accessibilityRole="tablist" style={styles.tabs}>
          {tabs.map((tab) => {
            const active = tab.value === activeTab;
            return (
              <Pressable
                accessibilityRole="tab"
                accessibilityState={{ selected: active }}
                key={tab.value}
                onPress={() => router.setParams({ tab: tab.value })}
                style={[styles.tab, active && styles.activeTab]}
              >
                <Text style={[styles.tabText, active && styles.activeTabText]}>
                  {tab.label}
                </Text>
                <Text style={[styles.tabCount, active && styles.activeTabText]}>
                  {bookingsByTab[tab.value].length}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {bookingsQuery.isLoading ? (
          <TripsSkeleton />
        ) : bookingsQuery.isError ? (
          <StateMessage
            actionLabel="Try again"
            body={normalizeApiError(bookingsQuery.error).message}
            onAction={() => void bookingsQuery.refetch()}
            title="Trips could not load"
          />
        ) : (
          <FlatList
            contentContainerStyle={styles.listContent}
            data={bookingsByTab[activeTab]}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <StateMessage
                body={`You do not have any ${tabs.find((tab) => tab.value === activeTab)?.label.toLowerCase()} trips.`}
                title="No trips here"
              />
            }
            refreshControl={
              <RefreshControl
                onRefresh={() => void bookingsQuery.refetch()}
                refreshing={isRefreshing}
              />
            }
            renderItem={({ item }) => <BookingCard booking={item} />}
            showsVerticalScrollIndicator={false}
            style={styles.list}
          />
        )}
      </View>
      <BottomNavigation />
    </SafeAreaView>
  );
}

function BookingCard({ booking }: { booking: RenterBooking }) {
  const vehicleName = `${booking.vehicle.make} ${booking.vehicle.model}`;
  const imageUrl = getVehicleImageVariantUrl(booking.vehicle.imageUrl, 'thumbnail');

  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`View ${vehicleName} booking`}
        onPress={() =>
          router.push({
            pathname: '/(customer)/booking/[id]',
            params: { id: booking.id, origin: 'customer-trips' },
          })
        }
        style={({ pressed }) => [styles.cardDetails, pressed && styles.pressed]}
      >
          <View style={styles.cardTop}>
          {imageUrl ? (
            <CachedVehicleImage style={styles.vehicleImage} uri={imageUrl} />
          ) : (
            <View style={styles.imageFallback}>
              <CarFront color="#102550" size={30} />
            </View>
          )}
          <View style={styles.cardCopy}>
            <View style={styles.titleRow}>
              <Text style={styles.vehicleName}>
                {vehicleName}
              </Text>
              <StatusBadge booking={booking} />
            </View>
            <Text numberOfLines={1} selectable style={styles.reference}>
              Ref {booking.reference.slice(0, 8).toUpperCase()}
            </Text>
            <Text numberOfLines={2} style={styles.location}>
              {locationLabel(booking) || 'Pickup location'}
            </Text>
          </View>
        </View>

        <View style={styles.dateRow}>
          <CalendarClock color="#536B91" size={17} />
          <View style={styles.dateCopy}>
            <Text style={styles.dateLabel}>Pickup</Text>
            <Text style={styles.dateValue}>
              {formatDateTime(booking.pickupAt)}
            </Text>
          </View>
          <View style={styles.dateCopy}>
            <Text style={styles.dateLabel}>Return</Text>
            <Text style={styles.dateValue}>
              {formatDateTime(booking.returnAt)}
            </Text>
          </View>
        </View>

        <View style={styles.footerRow}>
          <Text style={styles.paymentLabel}>
            {booking.tripPhase === 'payment_required' ? 'Amount due' : titleCase(booking.paymentStatus)}
          </Text>
          <Text style={styles.paymentAmount}>{formatMoney(getBookingTotal(booking))}</Text>
        </View>
      </Pressable>
      {getBookingCardAction(booking).kind === 'payment' ? (
        <Pressable
          accessibilityLabel={`Pay now for ${vehicleName}`}
          accessibilityRole="button"
          onPress={() =>
            router.push({
              pathname: '/(customer)/booking/payment',
              params: { bookingId: booking.id, origin: 'customer-trips' },
            })
          }
          style={({ pressed }) => [styles.completePaymentButton, pressed && styles.pressed]}
        >
          <Text style={styles.completePaymentText}>Pay now</Text>
        </Pressable>
      ) : (
        <Pressable
          accessibilityLabel={`${getBookingCardAction(booking).label} for ${vehicleName}`}
          accessibilityRole="button"
          onPress={() => openBooking(booking)}
          style={({ pressed }) => [styles.viewBookingButton, pressed && styles.pressed]}
        >
          <Text style={styles.viewBookingText}>{getBookingCardAction(booking).label}</Text>
        </Pressable>
      )}
    </View>
  );
}

function openBooking(booking: RenterBooking) {
  router.push({
    pathname: '/(customer)/booking/[id]',
    params: { id: booking.id, origin: 'customer-trips' },
  });
}

function getBookingCardAction(booking: RenterBooking) {
  if (booking.status === 'pending_payment' && booking.paymentStatus === 'pending') return { kind: 'payment' as const, label: 'Pay now' };
  if (booking.tripPhase === 'active' || booking.status === 'active') return { kind: 'details' as const, label: 'View trip' };
  if (booking.tripPhase === 'return_pending' || booking.status === 'return_pending') return { kind: 'details' as const, label: 'View return details' };
  if (getCustomerTripsPrimaryTab(booking) !== 'upcoming') return { kind: 'details' as const, label: 'View details' };
  return { kind: 'details' as const, label: 'View booking' };
}

function StatusBadge({ booking }: { booking: RenterBooking }) {
  return (
    <View style={[styles.statusBadge, statusStyle(booking.tripPhase)]}>
      <Text style={[styles.statusText, statusTextStyle(booking.tripPhase)]}>
        {getRenterTripStatusLabel(booking)}
      </Text>
    </View>
  );
}

function TripsSkeleton() {
  return (
    <View style={styles.skeletonList}>
      {[0, 1, 2].map((item) => (
        <View key={item} style={styles.skeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonCopy}>
            <View style={styles.skeletonWide} />
            <View style={styles.skeletonShort} />
            <View style={styles.skeletonMedium} />
          </View>
        </View>
      ))}
    </View>
  );
}

function StateMessage({
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
    <View style={styles.state}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.retryButton}>
          <Text style={styles.retryText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function statusStyle(phase: RenterTripPhase) {
  switch (phase) {
    case 'payment_required': return styles.paymentRequiredStatus;
    case 'awaiting_host_approval': return styles.awaitingHostStatus;
    case 'active': return styles.activeStatus;
    case 'return_pending': return styles.returnStatus;
    case 'completed': return styles.completedStatus;
    case 'cancelled': return styles.cancelledStatus;
    case 'disputed': return styles.disputedStatus;
    default: return styles.upcomingStatus;
  }
}

function statusTextStyle(phase: RenterTripPhase) {
  switch (phase) {
    case 'payment_required': return styles.paymentRequiredStatusText;
    case 'awaiting_host_approval': return styles.awaitingHostStatusText;
    case 'cancelled': return styles.cancelledStatusText;
    case 'disputed': return styles.disputedStatusText;
    case 'return_pending': return styles.returnStatusText;
    default: return styles.defaultStatusText;
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F3F9FF' },
  container: { flex: 1, minHeight: 0, paddingHorizontal: 16 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 76 },
  eyebrow: { color: '#536B91', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  title: { color: '#102550', fontSize: 26, fontWeight: '900' },
  iconButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 12, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 20, borderWidth: 1, flex: 1, flexDirection: 'row', gap: 5, justifyContent: 'center', minHeight: 44, paddingHorizontal: 8 },
  activeTab: { backgroundColor: '#0B6FE8', borderColor: '#0B6FE8' },
  tabText: { color: '#536B91', fontSize: 13, fontWeight: '800' },
  tabCount: { color: '#536B91', fontSize: 12, fontWeight: '900' },
  activeTabText: { color: '#FFFFFF' },
  list: { flex: 1, minHeight: 0 },
  listContent: { gap: 12, paddingBottom: 22 },
  card: { backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 16, borderWidth: 1, gap: 14, padding: 14 },
  cardDetails: { gap: 14 },
  cardTop: { flexDirection: 'row', gap: 12 },
  vehicleImage: { backgroundColor: '#F3F9FF', borderRadius: 12, height: 82, width: 92 },
  imageFallback: { alignItems: 'center', backgroundColor: '#EAF4FF', borderRadius: 12, height: 82, justifyContent: 'center', width: 92 },
  cardCopy: { flex: 1, gap: 5, minWidth: 0 },
  titleRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 8 },
  vehicleName: { color: '#102550', flex: 1, flexShrink: 1, fontSize: 17, fontWeight: '900', lineHeight: 22 },
  reference: { color: '#536B91', fontSize: 12, fontWeight: '700' },
  location: { color: '#536B91', fontSize: 13, fontWeight: '700', lineHeight: 18 },
  statusBadge: { alignSelf: 'flex-start', borderRadius: 12, flexShrink: 1, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  upcomingStatus: { backgroundColor: '#EAF4FF' }, paymentRequiredStatus: { backgroundColor: '#FFF7D6' }, awaitingHostStatus: { backgroundColor: '#EAF4FF' }, activeStatus: { backgroundColor: '#DCFCE7' }, returnStatus: { backgroundColor: '#FFF7D6' }, completedStatus: { backgroundColor: '#E6F8F2' }, cancelledStatus: { backgroundColor: '#FEECEC' }, disputedStatus: { backgroundColor: '#FFF0E5' },
  defaultStatusText: { color: '#0B6FE8' }, paymentRequiredStatusText: { color: '#A16207' }, awaitingHostStatusText: { color: '#0B6FE8' }, returnStatusText: { color: '#A16207' }, cancelledStatusText: { color: '#B91C1C' }, disputedStatusText: { color: '#C2410C' },
  dateRow: { alignItems: 'center', borderTopColor: '#D6E8FF', borderTopWidth: 1, flexDirection: 'row', gap: 10, paddingTop: 12 },
  dateCopy: { flex: 1, minWidth: 0 }, dateLabel: { color: '#536B91', fontSize: 11, fontWeight: '800' }, dateValue: { color: '#102550', fontSize: 12, fontWeight: '800', lineHeight: 17, marginTop: 2 },
  footerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, paymentLabel: { color: '#536B91', fontSize: 12, fontWeight: '800', textTransform: 'capitalize' }, paymentAmount: { color: '#102550', fontSize: 16, fontWeight: '900' },
  completePaymentButton: { alignItems: 'center', backgroundColor: '#0B6FE8', borderRadius: 10, justifyContent: 'center', minHeight: 44, paddingHorizontal: 16 }, completePaymentText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  viewBookingButton: { alignItems: 'center', borderColor: '#0B6FE8', borderRadius: 10, borderWidth: 1, justifyContent: 'center', minHeight: 44, paddingHorizontal: 16 }, viewBookingText: { color: '#0B6FE8', fontSize: 14, fontWeight: '900' },
  pressed: { opacity: 0.75 },
  skeletonList: { gap: 12, paddingTop: 4 }, skeletonCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, flexDirection: 'row', gap: 12, padding: 14 }, skeletonImage: { backgroundColor: '#E8EEF7', borderRadius: 12, height: 82, width: 100 }, skeletonCopy: { flex: 1, gap: 10 }, skeletonWide: { backgroundColor: '#E8EEF7', borderRadius: 5, height: 14, width: '80%' }, skeletonMedium: { backgroundColor: '#E8EEF7', borderRadius: 5, height: 11, width: '65%' }, skeletonShort: { backgroundColor: '#E8EEF7', borderRadius: 5, height: 11, width: '42%' },
  state: { alignItems: 'center', flexGrow: 1, gap: 10, justifyContent: 'center', padding: 28 }, stateTitle: { color: '#102550', fontSize: 20, fontWeight: '900', textAlign: 'center' }, stateBody: { color: '#536B91', fontSize: 14, fontWeight: '600', lineHeight: 21, textAlign: 'center' }, retryButton: { backgroundColor: '#0B6FE8', borderRadius: 12, justifyContent: 'center', marginTop: 4, minHeight: 44, paddingHorizontal: 18 }, retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});
