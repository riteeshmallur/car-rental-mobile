import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  CalendarClock,
  CarFront,
  MessageCircle,
  RefreshCw,
  Star,
  XCircle,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Image,
  Linking,
  Pressable,
  RefreshControl,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/features/customer/components/bottom-navigation';
import {
  formatMoney,
  getCarImageUrl,
} from '@/features/customer/utils/car-formatters';
import { bookingsApi } from '@/services/bookings/bookings-api';
import { useSafeBack } from '@/hooks/use-safe-back';
import { type RenterBooking, type RenterTripPhase } from '@/types/car';
import { normalizeApiError } from '@/utils/errors';

type TripTab = {
  label: string;
  value: RenterTripPhase;
};

const tabs: TripTab[] = [
  { label: 'Upcoming', value: 'upcoming' },
  { label: 'Active', value: 'active' },
  { label: 'Past', value: 'past' },
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

function getLocationLabel(booking: RenterBooking) {
  return [
    booking.pickupLocation.name,
    booking.pickupLocation.city,
    booking.pickupLocation.state,
  ]
    .filter(Boolean)
    .join(', ');
}

export function TripsScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<RenterTripPhase>('upcoming');
  useSafeBack({ fallback: '/(customer)/home' });

  const bookingsQuery = useQuery({
    queryKey: ['renters', 'me', 'bookings'],
    queryFn: bookingsApi.listRenterBookings,
  });

  const cancelMutation = useMutation({
    mutationFn: bookingsApi.cancel,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['renters', 'me', 'bookings'],
      });
    },
  });

  const bookingsByTab = useMemo(() => {
    const source = bookingsQuery.data ?? [];

    return source.reduce<Record<RenterTripPhase, RenterBooking[]>>(
      (acc, booking) => {
        acc[booking.tripPhase].push(booking);
        return acc;
      },
      {
        upcoming: [],
        active: [],
        past: [],
        cancelled: [],
      },
    );
  }, [bookingsQuery.data]);

  const visibleBookings = bookingsByTab[activeTab];
  const isRefreshing = bookingsQuery.isRefetching && !bookingsQuery.isLoading;

  const requestCancel = (booking: RenterBooking) => {
    Alert.alert(
      'Cancel booking',
      `Cancel ${booking.vehicle.make} ${booking.vehicle.model}?`,
      [
        { text: 'Keep booking', style: 'cancel' },
        {
          text: 'Cancel booking',
          style: 'destructive',
          onPress: () => cancelMutation.mutate(booking.id),
        },
      ],
    );
  };

  const showUnavailableAction = (message: string) => {
    Alert.alert('Not available yet', message);
  };

  const contactHost = (booking: RenterBooking) => {
    if (!booking.host.phoneNumber) {
      showUnavailableAction('The host has not shared a phone number.');
      return;
    }

    void Linking.openURL(`tel:${booking.host.phoneNumber}`);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Customer</Text>
            <Text style={styles.title}>Trips</Text>
          </View>
          {bookingsQuery.isFetching ? (
            <ActivityIndicator color="#111827" />
          ) : (
            <Pressable
              accessibilityLabel="Refresh trips"
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
            ListEmptyComponent={
              <StateMessage
                body={`You do not have ${tabs
                  .find((tab) => tab.value === activeTab)
                  ?.label.toLowerCase()} trips.`}
                title="No trips here"
              />
            }
            contentContainerStyle={styles.listContent}
            data={visibleBookings}
            keyExtractor={(item) => item.id}
            refreshControl={
              <RefreshControl
                onRefresh={() => void bookingsQuery.refetch()}
                refreshing={isRefreshing}
              />
            }
            renderItem={({ item }) => (
              <BookingCard
                booking={item}
                isCancelling={
                  cancelMutation.isPending && cancelMutation.variables === item.id
                }
                onCancel={() => requestCancel(item)}
                onContactHost={() => contactHost(item)}
                onExtend={() =>
                  showUnavailableAction(
                    'Booking extension will be available after the backend exposes an extend API.',
                  )
                }
                onLeaveReview={() =>
                  showUnavailableAction(
                    'Reviews will be available after the review submission API is connected.',
                  )
                }
                onReturnInstructions={() =>
                  showUnavailableAction(
                    'Return instructions will be shown once host handoff details are available.',
                  )
                }
                onViewDetails={() =>
                  router.push({
                    pathname: '/(customer)/booking/[id]',
                    params: { id: item.id, origin: 'customer-trips' },
                  })
                }
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
      <BottomNavigation />
    </SafeAreaView>
  );
}

function BookingCard({
  booking,
  isCancelling,
  onCancel,
  onContactHost,
  onExtend,
  onLeaveReview,
  onReturnInstructions,
  onViewDetails,
}: {
  booking: RenterBooking;
  isCancelling: boolean;
  onCancel: () => void;
  onContactHost: () => void;
  onExtend: () => void;
  onLeaveReview: () => void;
  onReturnInstructions: () => void;
  onViewDetails: () => void;
}) {
  const imageUrl = getCarImageUrl(booking.vehicle.imageUrl);
  const vehicleName = `${booking.vehicle.make} ${booking.vehicle.model}`;
  const locationLabel = getLocationLabel(booking) || 'Pickup location';

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
            <View style={[styles.statusBadge, getStatusStyle(booking.tripPhase)]}>
              <Text style={styles.statusText}>{formatStatus(booking.status)}</Text>
            </View>
          </View>
          <Text numberOfLines={1} selectable style={styles.reference}>
            Ref {booking.reference.slice(0, 8).toUpperCase()}
          </Text>
          <Text numberOfLines={1} style={styles.location}>
            {locationLabel}
          </Text>
        </View>
      </View>

      <View style={styles.datePanel}>
        <DateBlock label="Pickup" value={booking.pickupAt} />
        <View style={styles.dateDivider} />
        <DateBlock label="Return" value={booking.returnAt} />
      </View>

      <View style={styles.paymentRow}>
        <Text style={styles.paymentLabel}>Total paid</Text>
        <Text style={styles.paymentAmount}>{formatMoney(booking.totalPaid)}</Text>
      </View>

      <ActionRow
        booking={booking}
        isCancelling={isCancelling}
        onCancel={onCancel}
        onContactHost={onContactHost}
        onExtend={onExtend}
        onLeaveReview={onLeaveReview}
        onReturnInstructions={onReturnInstructions}
        onViewDetails={onViewDetails}
      />
    </View>
  );
}

function DateBlock({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.dateBlock}>
      <View style={styles.inlineRow}>
        <CalendarClock color="#6B7280" size={15} />
        <Text style={styles.dateLabel}>{label}</Text>
      </View>
      <Text style={styles.dateValue}>{formatDateTime(value)}</Text>
    </View>
  );
}

function ActionRow({
  booking,
  isCancelling,
  onCancel,
  onContactHost,
  onExtend,
  onLeaveReview,
  onReturnInstructions,
  onViewDetails,
}: {
  booking: RenterBooking;
  isCancelling: boolean;
  onCancel: () => void;
  onContactHost: () => void;
  onExtend: () => void;
  onLeaveReview: () => void;
  onReturnInstructions: () => void;
  onViewDetails: () => void;
}) {
  if (booking.tripPhase === 'upcoming') {
    return (
      <View style={styles.actions}>
        <ActionButton label="View details" onPress={onViewDetails} variant="dark" />
        <ActionButton
          icon={<XCircle color="#991B1B" size={16} />}
          isLoading={isCancelling}
          label="Cancel"
          onPress={onCancel}
          variant="danger"
        />
      </View>
    );
  }

  if (booking.tripPhase === 'active') {
    return (
      <View style={styles.actions}>
        <ActionButton
          icon={<MessageCircle color="#111827" size={16} />}
          label="Contact host"
          onPress={onContactHost}
        />
        <ActionButton label="Extend" onPress={onExtend} />
        <ActionButton label="Return instructions" onPress={onReturnInstructions} />
      </View>
    );
  }

  if (booking.tripPhase === 'past') {
    return (
      <View style={styles.actions}>
        <ActionButton
          icon={<Star color="#111827" size={16} />}
          label="Leave review"
          onPress={onLeaveReview}
          variant="dark"
        />
        <ActionButton label="View details" onPress={onViewDetails} />
      </View>
    );
  }

  return (
    <View style={styles.actions}>
      <ActionButton label="View details" onPress={onViewDetails} />
    </View>
  );
}

function ActionButton({
  icon,
  isLoading,
  label,
  onPress,
  variant = 'light',
}: {
  icon?: React.ReactNode;
  isLoading?: boolean;
  label: string;
  onPress: () => void;
  variant?: 'light' | 'dark' | 'danger';
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={isLoading}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        variant === 'dark' && styles.darkAction,
        variant === 'danger' && styles.dangerAction,
        pressed && styles.pressed,
        isLoading && styles.disabled,
      ]}
    >
      {isLoading ? <ActivityIndicator color="#991B1B" size="small" /> : icon}
      <Text
        style={[
          styles.actionText,
          variant === 'dark' && styles.darkActionText,
          variant === 'danger' && styles.dangerActionText,
        ]}
      >
        {isLoading ? 'Cancelling' : label}
      </Text>
    </Pressable>
  );
}

function TripsSkeleton() {
  return (
    <View style={styles.skeletonList}>
      {[0, 1, 2].map((item) => (
        <View key={item} style={styles.card}>
          <View style={styles.cardTop}>
            <View style={styles.skeletonImage} />
            <View style={styles.skeletonCopy}>
              <View style={styles.skeletonLineWide} />
              <View style={styles.skeletonLine} />
              <View style={styles.skeletonLineShort} />
            </View>
          </View>
          <View style={styles.skeletonPanel} />
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
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={styles.stateButton}
        >
          <Text style={styles.stateButtonText}>{actionLabel}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function getStatusStyle(phase: RenterTripPhase) {
  switch (phase) {
    case 'active':
      return styles.activeStatus;
    case 'past':
      return styles.pastStatus;
    case 'cancelled':
      return styles.cancelledStatus;
    default:
      return styles.upcomingStatus;
  }
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7FAFF',
  },
  container: {
    flex: 1,
    paddingHorizontal: 16,
  },
  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  eyebrow: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: '#111827',
    fontSize: 30,
    fontWeight: '900',
  },
  iconButton: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  tabs: {
    flexDirection: 'row',
    gap: 8,
    paddingBottom: 12,
  },
  tab: {
    flex: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  activeTab: {
    borderColor: '#0B4FE8',
    backgroundColor: '#0B4FE8',
  },
  tabText: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '900',
  },
  tabCount: {
    color: '#6B7280',
    fontSize: 11,
    fontWeight: '800',
  },
  activeTabText: {
    color: '#FFFFFF',
  },
  listContent: {
    gap: 14,
    paddingBottom: 106,
  },
  card: {
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  cardTop: {
    flexDirection: 'row',
    gap: 12,
  },
  vehicleImage: {
    height: 86,
    width: 104,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  imageFallback: {
    height: 86,
    width: 104,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#EAF2FF',
  },
  cardCopy: {
    flex: 1,
    justifyContent: 'center',
    gap: 7,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  vehicleName: {
    flex: 1,
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
  },
  reference: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '800',
  },
  location: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
  },
  statusBadge: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 5,
  },
  upcomingStatus: {
    backgroundColor: '#DBEAFE',
  },
  activeStatus: {
    backgroundColor: '#DCFCE7',
  },
  pastStatus: {
    backgroundColor: '#F3F4F6',
  },
  cancelledStatus: {
    backgroundColor: '#FEE2E2',
  },
  statusText: {
    color: '#111827',
    fontSize: 10,
    fontWeight: '900',
    textTransform: 'capitalize',
  },
  datePanel: {
    flexDirection: 'row',
    gap: 10,
    borderRadius: 8,
    backgroundColor: '#F7FAFF',
    padding: 10,
  },
  dateBlock: {
    flex: 1,
    gap: 6,
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800',
  },
  dateValue: {
    color: '#111827',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
  },
  dateDivider: {
    width: 1,
    backgroundColor: '#E5E7EB',
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  paymentLabel: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '800',
  },
  paymentAmount: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  darkAction: {
    borderColor: '#0B4FE8',
    backgroundColor: '#0B4FE8',
  },
  dangerAction: {
    borderColor: '#FCA5A5',
    backgroundColor: '#FEF2F2',
  },
  actionText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '900',
  },
  darkActionText: {
    color: '#FFFFFF',
  },
  dangerActionText: {
    color: '#991B1B',
  },
  pressed: {
    opacity: 0.76,
  },
  disabled: {
    opacity: 0.7,
  },
  skeletonList: {
    gap: 14,
    paddingBottom: 106,
  },
  skeletonImage: {
    height: 86,
    width: 104,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  skeletonCopy: {
    flex: 1,
    justifyContent: 'center',
    gap: 9,
  },
  skeletonLineWide: {
    height: 16,
    width: '86%',
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  skeletonLine: {
    height: 12,
    width: '64%',
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  skeletonLineShort: {
    height: 12,
    width: '42%',
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  skeletonPanel: {
    height: 76,
    borderRadius: 8,
    backgroundColor: '#F1F5F9',
  },
  state: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 24,
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
  stateButton: {
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0B4FE8',
    paddingHorizontal: 18,
    marginTop: 4,
  },
  stateButtonText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
