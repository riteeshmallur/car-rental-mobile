import { useQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import { CalendarClock, CarFront, RefreshCw } from 'lucide-react-native';
import { useMemo } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/features/customer/components/bottom-navigation';
import { formatMoney, getCarImageUrl } from '@/features/customer/utils/car-formatters';
import { useSafeBack } from '@/hooks/use-safe-back';
import { bookingsApi } from '@/services/bookings/bookings-api';
import { type RenterBooking, type RenterTripPhase } from '@/types/car';
import { normalizeApiError } from '@/utils/errors';

type TripTab = { label: string; value: RenterTripPhase };

const tabs: TripTab[] = [
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Active', value: 'active' },
  { label: 'Return pending', value: 'return_pending' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
  { label: 'Disputed', value: 'disputed' },
];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
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

export function TripsScreen() {
  const params = useLocalSearchParams<{ tab?: string | string[] }>();
  const requestedTab = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const activeTab = tabs.some((tab) => tab.value === requestedTab)
    ? (requestedTab as RenterTripPhase)
    : 'upcoming';
  useSafeBack({ fallback: '/(customer)/home' });

  const bookingsQuery = useQuery({
    queryKey: ['renters', 'me', 'bookings'],
    queryFn: bookingsApi.listRenterBookings,
  });

  const bookingsByTab = useMemo(() => {
    const grouped: Record<RenterTripPhase, RenterBooking[]> = {
      upcoming: [],
      active: [],
      return_pending: [],
      completed: [],
      cancelled: [],
      disputed: [],
    };

    for (const booking of bookingsQuery.data ?? []) {
      if (booking.tripPhase in grouped) {
        grouped[booking.tripPhase].push(booking);
      }
    }

    return grouped;
  }, [bookingsQuery.data]);

  const isRefreshing = bookingsQuery.isRefetching && !bookingsQuery.isLoading;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Customer</Text>
            <Text style={styles.title}>Trips</Text>
          </View>
          <Pressable
            accessibilityLabel="Refresh trips"
            accessibilityRole="button"
            disabled={bookingsQuery.isFetching}
            onPress={() => void bookingsQuery.refetch()}
            style={styles.iconButton}
          >
            {bookingsQuery.isFetching ? (
              <ActivityIndicator color="#0B4FE8" size="small" />
            ) : (
              <RefreshCw color="#111827" size={20} />
            )}
          </Pressable>
        </View>

        <ScrollView
          contentContainerStyle={styles.tabsContent}
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tabs}
        >
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
        </ScrollView>

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
                body={`You do not have ${tabs
                  .find((tab) => tab.value === activeTab)
                  ?.label.toLowerCase()} trips.`}
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
  const imageUrl = getCarImageUrl(booking.vehicle.imageUrl);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={() =>
        router.push({
          pathname: '/(customer)/booking/[id]',
          params: { id: booking.id, origin: 'customer-trips' },
        })
      }
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.cardTop}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.vehicleImage} />
        ) : (
          <View style={styles.imageFallback}>
            <CarFront color="#0F172A" size={30} />
          </View>
        )}
        <View style={styles.cardCopy}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.vehicleName}>
              {vehicleName}
            </Text>
            <StatusBadge phase={booking.tripPhase} />
          </View>
          <Text numberOfLines={1} selectable style={styles.reference}>
            Ref {booking.reference.slice(0, 8).toUpperCase()}
          </Text>
          <Text numberOfLines={1} style={styles.location}>
            {locationLabel(booking) || 'Pickup location'}
          </Text>
        </View>
      </View>

      <View style={styles.dateRow}>
        <CalendarClock color="#64748B" size={17} />
        <View style={styles.dateCopy}>
          <Text style={styles.dateLabel}>Pickup</Text>
          <Text numberOfLines={1} style={styles.dateValue}>
            {formatDateTime(booking.pickupAt)}
          </Text>
        </View>
        <View style={styles.dateCopy}>
          <Text style={styles.dateLabel}>Return</Text>
          <Text numberOfLines={1} style={styles.dateValue}>
            {formatDateTime(booking.returnAt)}
          </Text>
        </View>
      </View>

      <View style={styles.footerRow}>
        <Text style={styles.paymentLabel}>{titleCase(booking.paymentStatus)}</Text>
        <Text style={styles.paymentAmount}>{formatMoney(booking.totalPaid)}</Text>
      </View>
    </Pressable>
  );
}

function StatusBadge({ phase }: { phase: RenterTripPhase }) {
  return (
    <View style={[styles.statusBadge, statusStyle(phase)]}>
      <Text style={[styles.statusText, statusTextStyle(phase)]}>
        {titleCase(phase)}
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
    case 'cancelled': return styles.cancelledStatusText;
    case 'disputed': return styles.disputedStatusText;
    case 'return_pending': return styles.returnStatusText;
    default: return styles.defaultStatusText;
  }
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#F7FAFF' },
  container: { flex: 1, minHeight: 0, paddingHorizontal: 16 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 76 },
  eyebrow: { color: '#64748B', fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  title: { color: '#0F172A', fontSize: 26, fontWeight: '900' },
  iconButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 12, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  tabs: { flexGrow: 0, marginBottom: 12 },
  tabsContent: { gap: 8, paddingRight: 16 },
  tab: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 20, borderWidth: 1, flexDirection: 'row', gap: 6, minHeight: 40, paddingHorizontal: 12 },
  activeTab: { backgroundColor: '#0B4FE8', borderColor: '#0B4FE8' },
  tabText: { color: '#334155', fontSize: 13, fontWeight: '800' },
  tabCount: { color: '#64748B', fontSize: 12, fontWeight: '900' },
  activeTabText: { color: '#FFFFFF' },
  list: { flex: 1, minHeight: 0 },
  listContent: { gap: 12, paddingBottom: 22 },
  card: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 16, borderWidth: 1, gap: 14, padding: 14 },
  cardTop: { flexDirection: 'row', gap: 12 },
  vehicleImage: { backgroundColor: '#F1F5F9', borderRadius: 12, height: 82, width: 100 },
  imageFallback: { alignItems: 'center', backgroundColor: '#EEF4FF', borderRadius: 12, height: 82, justifyContent: 'center', width: 100 },
  cardCopy: { flex: 1, gap: 5, minWidth: 0 },
  titleRow: { alignItems: 'flex-start', flexDirection: 'row', gap: 8 },
  vehicleName: { color: '#0F172A', flex: 1, fontSize: 17, fontWeight: '900' },
  reference: { color: '#64748B', fontSize: 12, fontWeight: '700' },
  location: { color: '#475569', fontSize: 13, fontWeight: '700' },
  statusBadge: { borderRadius: 12, maxWidth: 122, paddingHorizontal: 8, paddingVertical: 4 },
  statusText: { fontSize: 10, fontWeight: '900', textTransform: 'uppercase' },
  upcomingStatus: { backgroundColor: '#EAF2FF' }, activeStatus: { backgroundColor: '#DCFCE7' }, returnStatus: { backgroundColor: '#FFF7D6' }, completedStatus: { backgroundColor: '#E6F8F2' }, cancelledStatus: { backgroundColor: '#FEECEC' }, disputedStatus: { backgroundColor: '#FFF0E5' },
  defaultStatusText: { color: '#0B4FE8' }, returnStatusText: { color: '#A16207' }, cancelledStatusText: { color: '#B91C1C' }, disputedStatusText: { color: '#C2410C' },
  dateRow: { alignItems: 'center', borderTopColor: '#EEF2F7', borderTopWidth: 1, flexDirection: 'row', gap: 10, paddingTop: 12 },
  dateCopy: { flex: 1, minWidth: 0 }, dateLabel: { color: '#64748B', fontSize: 11, fontWeight: '800' }, dateValue: { color: '#1E293B', fontSize: 12, fontWeight: '800', marginTop: 2 },
  footerRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' }, paymentLabel: { color: '#64748B', fontSize: 12, fontWeight: '800', textTransform: 'capitalize' }, paymentAmount: { color: '#0F172A', fontSize: 16, fontWeight: '900' },
  pressed: { opacity: 0.75 },
  skeletonList: { gap: 12, paddingTop: 4 }, skeletonCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 16, flexDirection: 'row', gap: 12, padding: 14 }, skeletonImage: { backgroundColor: '#E8EEF7', borderRadius: 12, height: 82, width: 100 }, skeletonCopy: { flex: 1, gap: 10 }, skeletonWide: { backgroundColor: '#E8EEF7', borderRadius: 5, height: 14, width: '80%' }, skeletonMedium: { backgroundColor: '#E8EEF7', borderRadius: 5, height: 11, width: '65%' }, skeletonShort: { backgroundColor: '#E8EEF7', borderRadius: 5, height: 11, width: '42%' },
  state: { alignItems: 'center', flexGrow: 1, gap: 10, justifyContent: 'center', padding: 28 }, stateTitle: { color: '#0F172A', fontSize: 20, fontWeight: '900', textAlign: 'center' }, stateBody: { color: '#64748B', fontSize: 14, fontWeight: '600', lineHeight: 21, textAlign: 'center' }, retryButton: { backgroundColor: '#0B4FE8', borderRadius: 12, justifyContent: 'center', marginTop: 4, minHeight: 44, paddingHorizontal: 18 }, retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});
