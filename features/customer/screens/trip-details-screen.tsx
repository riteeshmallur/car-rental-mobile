import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  CalendarClock,
  CarFront,
  MessageCircle,
  Star,
  XCircle,
} from 'lucide-react-native';
import {
  ActivityIndicator,
  Alert,
  Image,
  Linking,
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
import { bookingsApi } from '@/services/bookings/bookings-api';
import { useSafeBack } from '@/hooks/use-safe-back';
import { type Booking, type RenterBooking, type RenterTripPhase } from '@/types/car';
import { normalizeApiError } from '@/utils/errors';

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value.replace(/_/g, ' ');
}

function deriveTripPhase(booking: Booking): RenterTripPhase {
  if (booking.status === 'cancelled' || booking.status === 'failed') {
    return 'cancelled';
  }

  const now = Date.now();
  const pickupAt = new Date(booking.pickupAt).getTime();
  const returnAt = new Date(booking.returnAt).getTime();

  if (returnAt <= now) {
    return 'past';
  }

  if (pickupAt <= now && returnAt > now) {
    return 'active';
  }

  return 'upcoming';
}

function isRenterBooking(booking: Booking | RenterBooking): booking is RenterBooking {
  return 'vehicle' in booking;
}

export function TripDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string; origin?: string }>();
  const bookingId = getParam(params.id);
  const origin = getParam(params.origin);
  const queryClient = useQueryClient();
  const goBack = useSafeBack({
    fallback:
      origin === 'host-bookings'
        ? '/(host)/bookings'
        : '/(customer)/trips',
  });

  const renterBookingsQuery = useQuery({
    queryKey: ['renters', 'me', 'bookings'],
    queryFn: bookingsApi.listRenterBookings,
  });

  const cachedBooking = renterBookingsQuery.data?.find(
    (booking) => booking.id === bookingId,
  );

  const bookingQuery = useQuery({
    enabled: Boolean(
      bookingId && !cachedBooking && !renterBookingsQuery.isPending,
    ),
    queryKey: ['bookings', bookingId],
    queryFn: () => bookingsApi.findById(bookingId ?? ''),
  });

  const cancelMutation = useMutation({
    mutationFn: bookingsApi.cancel,
    onSuccess: () => {
      void queryClient.invalidateQueries({
        queryKey: ['renters', 'me', 'bookings'],
      });
      void queryClient.invalidateQueries({ queryKey: ['bookings', bookingId] });
    },
  });

  const booking = cachedBooking ?? bookingQuery.data;
  const phase = booking ? deriveTripPhase(booking) : null;

  const showUnavailableAction = (message: string) => {
    Alert.alert('Not available yet', message);
  };

  const requestCancel = () => {
    if (!booking) {
      return;
    }

    Alert.alert('Cancel booking', 'Cancel this upcoming booking?', [
      { text: 'Keep booking', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: () => cancelMutation.mutate(booking.id),
      },
    ]);
  };

  const contactHost = () => {
    if (!booking || !isRenterBooking(booking) || !booking.host.phoneNumber) {
      showUnavailableAction('The host has not shared a phone number.');
      return;
    }

    void Linking.openURL(`tel:${booking.host.phoneNumber}`);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={goBack}
          style={styles.iconButton}
        >
          <ArrowLeft color="#111827" size={22} />
        </Pressable>
        <View>
          <Text style={styles.eyebrow}>Trip</Text>
          <Text style={styles.title}>Booking details</Text>
        </View>
      </View>

      {!bookingId ? (
        <StateMessage body="The booking reference is missing." title="Trip not found" />
      ) : renterBookingsQuery.isLoading || bookingQuery.isLoading ? (
        <View style={styles.loadingState}>
          <ActivityIndicator color="#111827" />
          <Text style={styles.mutedText}>Loading booking</Text>
        </View>
      ) : bookingQuery.isError ? (
        <StateMessage
          actionLabel="Try again"
          body={normalizeApiError(bookingQuery.error).message}
          onAction={() => void bookingQuery.refetch()}
          title="Booking could not load"
        />
      ) : booking ? (
        <ScrollView contentContainerStyle={styles.content}>
          <VehicleSummary booking={booking} />

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Rental window</Text>
            <DetailRow icon={<CalendarClock color="#6B7280" size={18} />} label="Pickup">
              {formatDateTime(booking.pickupAt)}
            </DetailRow>
            <DetailRow icon={<CalendarClock color="#6B7280" size={18} />} label="Return">
              {formatDateTime(booking.returnAt)}
            </DetailRow>
          </View>

          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment</Text>
            <DetailRow label="Status">{formatStatus(booking.status)}</DetailRow>
            <DetailRow label="Payment">{formatStatus(booking.paymentStatus)}</DetailRow>
            <DetailRow label="Total">{formatMoney(booking.totalPrice)}</DetailRow>
            {isRenterBooking(booking) ? (
              <DetailRow label="Total paid">{formatMoney(booking.totalPaid)}</DetailRow>
            ) : null}
          </View>

          {isRenterBooking(booking) ? (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pickup and host</Text>
              <DetailRow label="Pickup">
                {[
                  booking.pickupLocation.name,
                  booking.pickupLocation.city,
                  booking.pickupLocation.state,
                ]
                  .filter(Boolean)
                  .join(', ') || 'Pickup location'}
              </DetailRow>
              <DetailRow label="Host">{booking.host.name}</DetailRow>
            </View>
          ) : null}

          {phase ? (
            <TripActions
              isCancelling={cancelMutation.isPending}
              onCancel={requestCancel}
              onContactHost={contactHost}
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
              phase={phase}
            />
          ) : null}
        </ScrollView>
      ) : (
        <StateMessage body="No booking exists for this reference." title="Trip not found" />
      )}
    </SafeAreaView>
  );
}

function VehicleSummary({ booking }: { booking: Booking | RenterBooking }) {
  if (!isRenterBooking(booking)) {
    return (
      <View style={styles.vehicleRow}>
        <View style={styles.imageFallback}>
          <CarFront color="#0F172A" size={32} />
        </View>
        <View style={styles.vehicleCopy}>
          <Text style={styles.vehicleTitle}>Booking {booking.id.slice(0, 8)}</Text>
          <Text selectable style={styles.reference}>
            Ref {booking.id}
          </Text>
        </View>
      </View>
    );
  }

  const imageUrl = getCarImageUrl(booking.vehicle.imageUrl);

  return (
    <View style={styles.vehicleRow}>
      {imageUrl ? (
        <Image source={{ uri: imageUrl }} style={styles.vehicleImage} />
      ) : (
        <View style={styles.imageFallback}>
          <CarFront color="#0F172A" size={32} />
        </View>
      )}
      <View style={styles.vehicleCopy}>
        <Text style={styles.vehicleTitle}>
          {booking.vehicle.make} {booking.vehicle.model}
        </Text>
        <Text selectable style={styles.reference}>
          Ref {booking.reference}
        </Text>
      </View>
    </View>
  );
}

function DetailRow({
  children,
  icon,
  label,
}: {
  children: React.ReactNode;
  icon?: React.ReactNode;
  label: string;
}) {
  return (
    <View style={styles.detailRow}>
      <View style={styles.detailLabelWrap}>
        {icon}
        <Text style={styles.detailLabel}>{label}</Text>
      </View>
      <Text style={styles.detailValue}>{children}</Text>
    </View>
  );
}

function TripActions({
  isCancelling,
  onCancel,
  onContactHost,
  onExtend,
  onLeaveReview,
  onReturnInstructions,
  phase,
}: {
  isCancelling: boolean;
  onCancel: () => void;
  onContactHost: () => void;
  onExtend: () => void;
  onLeaveReview: () => void;
  onReturnInstructions: () => void;
  phase: RenterTripPhase;
}) {
  if (phase === 'upcoming') {
    return (
      <View style={styles.actions}>
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

  if (phase === 'active') {
    return (
      <View style={styles.actions}>
        <ActionButton
          icon={<MessageCircle color="#111827" size={16} />}
          label="Contact host"
          onPress={onContactHost}
        />
        <ActionButton label="Extend booking" onPress={onExtend} />
        <ActionButton label="Return instructions" onPress={onReturnInstructions} />
      </View>
    );
  }

  if (phase === 'past') {
    return (
      <View style={styles.actions}>
        <ActionButton
          icon={<Star color="#FFFFFF" size={16} />}
          label="Leave review"
          onPress={onLeaveReview}
          variant="dark"
        />
      </View>
    );
  }

  return null;
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

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F7FAFF',
  },
  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
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
  eyebrow: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    textTransform: 'uppercase',
  },
  title: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
  },
  content: {
    gap: 14,
    padding: 16,
    paddingBottom: 32,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
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
    height: 88,
    width: 108,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  imageFallback: {
    height: 88,
    width: 108,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#EAF2FF',
  },
  vehicleCopy: {
    flex: 1,
    justifyContent: 'center',
    gap: 8,
  },
  vehicleTitle: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  reference: {
    color: '#4B5563',
    fontSize: 12,
    fontWeight: '800',
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
  detailRow: {
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    paddingTop: 10,
  },
  detailLabelWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailLabel: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800',
  },
  detailValue: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
    lineHeight: 20,
  },
  mutedText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  actionButton: {
    minHeight: 42,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    borderWidth: 1,
    borderColor: '#D1D5DB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
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
    fontSize: 13,
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
