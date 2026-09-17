import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ArrowLeft,
  CalendarClock,
  CarFront,
  Check,
  Eye,
  RefreshCw,
  RotateCcw,
  User,
  X,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  formatMoney,
  getCarImageUrl,
} from '@/features/customer/utils/car-formatters';
import { hostsApi } from '@/services/hosts/hosts-api';
import { useSafeBack } from '@/hooks/use-safe-back';
import { type HostBooking, type HostBookingPhase } from '@/types/car';
import { normalizeApiError } from '@/utils/errors';

const tabs: { label: string; value: HostBookingPhase }[] = [
  { label: 'Requests', value: 'requests' },
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Active', value: 'active' },
  { label: 'Completed', value: 'completed' },
  { label: 'Cancelled', value: 'cancelled' },
];

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value.replace(/_/g, ' ');
}

export function HostBookingsScreen() {
  const [activeTab, setActiveTab] = useState<HostBookingPhase>('requests');
  const goBack = useSafeBack({ fallback: '/(host)/profile' });

  const bookingsQuery = useQuery({
    queryKey: ['host', 'bookings'],
    queryFn: hostsApi.listBookings,
  });

  const bookingsByTab = useMemo(() => {
    const source = bookingsQuery.data ?? [];

    return source.reduce<Record<HostBookingPhase, HostBooking[]>>(
      (acc, booking) => {
        acc[booking.hostPhase].push(booking);
        return acc;
      },
      {
        requests: [],
        upcoming: [],
        active: [],
        completed: [],
        cancelled: [],
      },
    );
  }, [bookingsQuery.data]);

  const visibleBookings = bookingsByTab[activeTab];
  const isRefreshing = bookingsQuery.isRefetching && !bookingsQuery.isLoading;

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View style={styles.headerLead}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              onPress={goBack}
              style={styles.iconButton}
            >
              <ArrowLeft color="#111827" size={20} />
            </Pressable>
            <View>
              <Text style={styles.eyebrow}>Host</Text>
              <Text style={styles.title}>Bookings</Text>
            </View>
          </View>
          {bookingsQuery.isFetching ? (
            <ActivityIndicator color="#111827" />
          ) : (
            <Pressable
              accessibilityLabel="Refresh bookings"
              accessibilityRole="button"
              onPress={() => void bookingsQuery.refetch()}
              style={styles.iconButton}
            >
              <RefreshCw color="#111827" size={20} />
            </Pressable>
          )}
        </View>

        <View style={styles.tabs}>
          {tabs.map((tab) => {
            const isActive = activeTab === tab.value;

            return (
              <Pressable
                accessibilityRole="button"
                key={tab.value}
                onPress={() => setActiveTab(tab.value)}
                style={[styles.tab, isActive && styles.activeTab]}
              >
                <Text style={[styles.tabText, isActive && styles.activeTabText]}>
                  {tab.label}
                </Text>
                <Text style={[styles.tabCount, isActive && styles.activeTabText]}>
                  {bookingsByTab[tab.value].length}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {bookingsQuery.isLoading ? (
          <BookingsSkeleton />
        ) : bookingsQuery.isError ? (
          <StateMessage
            actionLabel="Try again"
            body={normalizeApiError(bookingsQuery.error).message}
            onAction={() => void bookingsQuery.refetch()}
            title="Bookings could not load"
          />
        ) : (
          <FlatList
            ListEmptyComponent={
              <StateMessage
                body={`No ${tabs
                  .find((tab) => tab.value === activeTab)
                  ?.label.toLowerCase()} bookings.`}
                title="Nothing here"
              />
            }
            contentContainerStyle={styles.listContent}
            data={visibleBookings}
            keyExtractor={(item) => item.id}
            style={styles.listView}
            refreshControl={
              <RefreshControl
                onRefresh={() => void bookingsQuery.refetch()}
                refreshing={isRefreshing}
              />
            }
            renderItem={({ item }) => <HostBookingCard booking={item} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function HostBookingCard({ booking }: { booking: HostBooking }) {
  const imageUrl = getCarImageUrl(booking.vehicle.imageUrl);
  const vehicleName = `${booking.vehicle.make} ${booking.vehicle.model}`;

  const unsupportedAction = (title: string) => {
    Alert.alert(title, 'This action will be enabled when the backend endpoint is available.');
  };

  return (
    <View style={styles.card}>
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
            <View style={[styles.statusBadge, getPhaseStyle(booking.hostPhase)]}>
              <Text style={styles.statusText}>{formatStatus(booking.status)}</Text>
            </View>
          </View>
          <View style={styles.customerRow}>
            <User color="#6B7280" size={15} />
            <Text numberOfLines={1} style={styles.customerText}>
              {booking.customer.name}
            </Text>
          </View>
          <Text selectable style={styles.reference}>
            Ref {booking.reference.slice(0, 8).toUpperCase()}
          </Text>
        </View>
      </View>

      <View style={styles.datePanel}>
        <DateBlock label="Pickup" value={booking.pickupAt} />
        <View style={styles.dateDivider} />
        <DateBlock label="Return" value={booking.returnAt} />
      </View>

      <View style={styles.amountRow}>
        <Text style={styles.amountLabel}>Amount</Text>
        <Text style={styles.amountValue}>{formatMoney(booking.amount)}</Text>
      </View>

      <View style={styles.actionGrid}>
        {booking.manualApprovalRequired && booking.hostPhase === 'requests' ? (
          <>
            <ActionButton
              icon={<Check color="#047857" size={16} />}
              label="Accept"
              onPress={() => unsupportedAction('Accept booking')}
            />
            <ActionButton
              icon={<X color="#B91C1C" size={16} />}
              label="Decline"
              onPress={() => unsupportedAction('Decline booking')}
            />
          </>
        ) : null}

        {booking.hostPhase === 'upcoming' || booking.hostPhase === 'requests' ? (
          <ActionButton
            icon={<Eye color="#111827" size={16} />}
            label="View booking"
            onPress={() =>
              router.push({
                pathname: '/(customer)/booking/[id]',
                params: { id: booking.id, origin: 'host-bookings' },
              })
            }
          />
        ) : null}

        {booking.hostPhase === 'active' ? (
          <>
            <ActionButton
              icon={<CalendarClock color="#111827" size={16} />}
              label="Trip status"
              onPress={() => unsupportedAction('Trip status')}
            />
            <ActionButton
              icon={<RotateCcw color="#111827" size={16} />}
              label="Return details"
              onPress={() => unsupportedAction('Return details')}
            />
          </>
        ) : null}

        {booking.hostPhase === 'completed' || booking.hostPhase === 'cancelled' ? (
          <ActionButton
            icon={<Eye color="#111827" size={16} />}
            label="View booking"
            onPress={() =>
              router.push({
                pathname: '/(customer)/booking/[id]',
                params: { id: booking.id, origin: 'host-bookings' },
              })
            }
          />
        ) : null}
      </View>
    </View>
  );
}

function DateBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dateBlock}>
      <Text style={styles.dateLabel}>{label}</Text>
      <Text style={styles.dateValue}>{formatDateTime(value)}</Text>
    </View>
  );
}

function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
    >
      {icon}
      <Text style={styles.actionText}>{label}</Text>
    </Pressable>
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
    <View style={styles.stateBox}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      {actionLabel && onAction ? (
        <Pressable accessibilityRole="button" onPress={onAction} style={styles.stateButton}>
          <Text style={styles.stateButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function BookingsSkeleton() {
  return (
    <View style={styles.listContent}>
      {[0, 1, 2].map((item) => (
        <View key={item} style={styles.skeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonLines}>
            <View style={styles.skeletonLineWide} />
            <View style={styles.skeletonLine} />
            <View style={styles.skeletonLineShort} />
          </View>
        </View>
      ))}
    </View>
  );
}

function getPhaseStyle(phase: HostBookingPhase) {
  if (phase === 'active') {
    return styles.statusGreen;
  }

  if (phase === 'requests') {
    return styles.statusYellow;
  }

  if (phase === 'cancelled') {
    return styles.statusRed;
  }

  if (phase === 'completed') {
    return styles.statusGray;
  }

  return styles.statusBlue;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7FAFF',
  },
  container: {
    flex: 1,
  },
  header: {
    minHeight: 78,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
  },
  headerLead: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  eyebrow: {
    color: '#0F766E',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  title: {
    color: '#111827',
    fontSize: 28,
    fontWeight: '900',
  },
  iconButton: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  tab: {
    minHeight: 44,
    flex: 1,
    minWidth: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 3,
  },
  activeTab: {
    borderColor: '#0F766E',
    backgroundColor: '#CCFBF1',
  },
  tabText: {
    color: '#4B5563',
    fontSize: 10,
    fontWeight: '900',
    textAlign: 'center',
  },
  tabCount: {
    marginTop: 2,
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '900',
  },
  activeTabText: {
    color: '#0F766E',
  },
  listContent: {
    gap: 12,
    padding: 16,
    paddingBottom: 30,
  },
  listView: {
    flex: 1,
    minHeight: 0,
  },
  card: {
    gap: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  cardTop: {
    flexDirection: 'row',
    gap: 12,
  },
  vehicleImage: {
    height: 92,
    width: 102,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  imageFallback: {
    height: 92,
    width: 102,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#EAF2FF',
  },
  cardCopy: {
    flex: 1,
    gap: 6,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vehicleName: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  customerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customerText: {
    flex: 1,
    color: '#374151',
    fontSize: 13,
    fontWeight: '900',
  },
  reference: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    color: '#111827',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  statusGreen: {
    backgroundColor: '#DCFCE7',
  },
  statusYellow: {
    backgroundColor: '#FEF3C7',
  },
  statusBlue: {
    backgroundColor: '#DBEAFE',
  },
  statusGray: {
    backgroundColor: '#E5E7EB',
  },
  statusRed: {
    backgroundColor: '#FEE2E2',
  },
  datePanel: {
    flexDirection: 'row',
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    padding: 12,
  },
  dateBlock: {
    flex: 1,
    gap: 4,
  },
  dateDivider: {
    width: 1,
    marginHorizontal: 12,
    backgroundColor: '#E5E7EB',
  },
  dateLabel: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  dateValue: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 19,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  amountLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '900',
  },
  amountValue: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
  },
  actionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    minHeight: 42,
    flexGrow: 1,
    flexBasis: '47%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 10,
  },
  actionText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '900',
  },
  stateBox: {
    margin: 16,
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    backgroundColor: '#FFFFFF',
    padding: 18,
  },
  stateTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  stateBody: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  stateButton: {
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0B4FE8',
    paddingHorizontal: 16,
  },
  stateButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  skeletonCard: {
    minHeight: 116,
    flexDirection: 'row',
    gap: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  skeletonImage: {
    height: 92,
    width: 102,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  skeletonLines: {
    flex: 1,
    gap: 10,
    justifyContent: 'center',
  },
  skeletonLineWide: {
    height: 16,
    width: '80%',
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  skeletonLine: {
    height: 13,
    width: '58%',
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  skeletonLineShort: {
    height: 13,
    width: '38%',
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  pressed: {
    opacity: 0.82,
  },
});
