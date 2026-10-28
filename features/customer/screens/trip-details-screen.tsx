import DateTimePicker from '@react-native-community/datetimepicker';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  CalendarClock,
  CarFront,
  CheckCircle2,
  CircleDollarSign,
  ClipboardCheck,
  MapPin,
  MessageCircleWarning,
  Phone,
  ReceiptText,
  RefreshCw,
  RotateCw,
  Star,
  XCircle,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Linking,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CachedVehicleImage } from '@/features/customer/components/cached-vehicle-image';
import { formatMoney, getVehicleImageVariantUrl } from '@/features/customer/utils/car-formatters';
import { useSafeBack } from '@/hooks/use-safe-back';
import { bookingsApi } from '@/services/bookings/bookings-api';
import { type RenterTrip } from '@/types/car';
import { normalizeApiError } from '@/utils/errors';
import { getTripActionVisibility } from '@/utils/trip-action-visibility';

type SheetName = 'extend' | 'return' | 'issue' | 'review' | null;
type FuelLevel = 'empty' | 'quarter' | 'half' | 'three_quarters' | 'full';

const fuelOptions: Array<{ label: string; value: FuelLevel }> = [
  { label: 'Empty', value: 'empty' },
  { label: '1/4', value: 'quarter' },
  { label: '1/2', value: 'half' },
  { label: '3/4', value: 'three_quarters' },
  { label: 'Full', value: 'full' },
];

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(
    new Date(value),
  );
}

function titleCase(value: string | null | undefined) {
  return (value ?? 'Pending').replace(/_/g, ' ');
}

function tripTitle(stage: RenterTrip['stage']) {
  switch (stage) {
    case 'return_pending':
      return 'Return pending';
    default:
      return titleCase(stage);
  }
}

export function TripDetailsScreen() {
  const params = useLocalSearchParams<{ id?: string; origin?: string }>();
  const bookingId = getParam(params.id);
  const origin = getParam(params.origin);
  const queryClient = useQueryClient();
  const goBack = useSafeBack({
    fallback: origin === 'host-bookings' ? '/(host)/bookings' : '/(customer)/trips',
  });
  const [sheet, setSheet] = useState<SheetName>(null);
  const [receiptRequested, setReceiptRequested] = useState(false);

  const tripQuery = useQuery({
    enabled: Boolean(bookingId),
    queryKey: ['bookings', 'trip', bookingId],
    queryFn: () => bookingsApi.findTrip(bookingId ?? ''),
  });
  const trip = tripQuery.data;

  const paymentQuery = useQuery({
    enabled: Boolean(bookingId && trip),
    queryKey: ['bookings', 'payment', bookingId],
    queryFn: () => bookingsApi.findPayment(bookingId ?? ''),
    retry: 1,
  });
  const receiptQuery = useQuery({
    enabled: Boolean(bookingId && receiptRequested && trip?.capabilities.viewReceipt),
    queryKey: ['bookings', 'receipt', bookingId],
    queryFn: () => bookingsApi.findReceipt(bookingId ?? ''),
    retry: 1,
  });

  const refreshTrip = useCallback(() => {
    void queryClient.invalidateQueries({ queryKey: ['renters', 'me', 'bookings'] });
    void queryClient.invalidateQueries({ queryKey: ['bookings', 'trip', bookingId] });
    void queryClient.invalidateQueries({ queryKey: ['bookings', 'payment', bookingId] });
  }, [bookingId, queryClient]);

  const cancelMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason?: string }) =>
      bookingsApi.cancel(id, { reason }),
    onSuccess: refreshTrip,
    onError: (error) => showRequestError(error),
  });
  const extendMutation = useMutation({
    mutationFn: ({ id, returnAt }: { id: string; returnAt: string }) =>
      bookingsApi.extend(id, { returnAt }),
    onSuccess: () => {
      setSheet(null);
      refreshTrip();
    },
    onError: (error) => showRequestError(error),
  });
  const returnMutation = useMutation({
    mutationFn: ({
      id,
      odometerReading,
      fuelLevel,
      note,
    }: {
      id: string;
      odometerReading: number;
      fuelLevel: FuelLevel;
      note?: string;
    }) => bookingsApi.returnVehicle(id, { odometerReading, fuelLevel, note }),
    onSuccess: () => {
      setSheet(null);
      refreshTrip();
    },
    onError: (error) => showRequestError(error),
  });
  const disputeMutation = useMutation({
    mutationFn: ({ id, reason }: { id: string; reason: string }) =>
      bookingsApi.dispute(id, { reason }),
    onSuccess: () => {
      setSheet(null);
      refreshTrip();
    },
    onError: (error) => showRequestError(error),
  });
  const reviewMutation = useMutation({
    mutationFn: ({ id, rating, comment }: { id: string; rating: number; comment?: string }) =>
      bookingsApi.createReview(id, { rating, comment }),
    onSuccess: () => {
      setSheet(null);
      refreshTrip();
    },
    onError: (error) => showRequestError(error),
  });

  const isMutating =
    cancelMutation.isPending ||
    extendMutation.isPending ||
    returnMutation.isPending ||
    disputeMutation.isPending ||
    reviewMutation.isPending;

  const requestCancellation = () => {
    if (!trip || cancelMutation.isPending) return;
    Alert.alert('Cancel booking', 'This cancellation is sent to the booking service. Any refund is calculated by the backend.', [
      { text: 'Keep booking', style: 'cancel' },
      {
        text: 'Cancel booking',
        style: 'destructive',
        onPress: () => cancelMutation.mutate({ id: trip.id }),
      },
    ]);
  };

  const contactHost = () => {
    const phone = trip?.pickup.hostPhoneNumber;
    if (!phone) return;
    void Linking.openURL(`tel:${phone}`).catch(() => {
      Alert.alert('Unable to call', 'This device cannot open the phone application.');
    });
  };

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          disabled={isMutating}
          onPress={goBack}
          style={styles.iconButton}
        >
          <ArrowLeft color="#102550" size={22} />
        </Pressable>
        <View style={styles.headerCopy}>
          <Text style={styles.eyebrow}>Trip</Text>
          <Text style={styles.title}>Booking details</Text>
        </View>
        <Pressable
          accessibilityLabel="Refresh trip"
          accessibilityRole="button"
          disabled={tripQuery.isFetching || isMutating}
          onPress={() => void tripQuery.refetch()}
          style={styles.iconButton}
        >
          {tripQuery.isFetching ? (
            <ActivityIndicator color="#0B6FE8" size="small" />
          ) : (
            <RefreshCw color="#102550" size={20} />
          )}
        </Pressable>
      </View>

      {!bookingId ? (
        <StateMessage body="The booking reference is missing." title="Trip not found" />
      ) : tripQuery.isLoading ? (
        <LoadingState />
      ) : tripQuery.isError ? (
        <StateMessage
          actionLabel="Try again"
          body={normalizeApiError(tripQuery.error).message}
          onAction={() => void tripQuery.refetch()}
          title="Trip could not load"
        />
      ) : trip ? (
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <VehicleSummary trip={trip} />
          <StatusBanner trip={trip} />
          <RentalWindow trip={trip} />
          <PickupDetails trip={trip} onContactHost={contactHost} />
          <PaymentDetails isLoading={paymentQuery.isLoading} trip={trip} payment={paymentQuery.data} />
          <LifecycleDetails trip={trip} />
          <TripActions
            isMutating={isMutating}
            onCancel={requestCancellation}
            onExtend={() => setSheet('extend')}
            onIssue={() => setSheet('issue')}
            onReturn={() => setSheet('return')}
            onReview={() => setSheet('review')}
            onViewReceipt={() => setReceiptRequested(true)}
            receiptLoading={receiptQuery.isFetching}
            trip={trip}
          />
          {receiptRequested ? (
            receiptQuery.isError ? (
              <StateMessage
                actionLabel="Retry receipt"
                body={normalizeApiError(receiptQuery.error).message}
                onAction={() => void receiptQuery.refetch()}
                title="Receipt could not load"
              />
            ) : receiptQuery.data ? (
              <ReceiptDetails receipt={receiptQuery.data} />
            ) : receiptQuery.isFetching ? (
              <View style={styles.inlineLoading}><ActivityIndicator color="#0B6FE8" /><Text style={styles.mutedText}>Loading receipt</Text></View>
            ) : null
          ) : null}
        </ScrollView>
      ) : null}

      {trip ? (
        <TripActionSheets
          isSubmitting={isMutating}
          onClose={() => setSheet(null)}
          onExtend={(returnAt) => extendMutation.mutate({ id: trip.id, returnAt })}
          onReportIssue={(reason) => disputeMutation.mutate({ id: trip.id, reason })}
          onReturn={(odometerReading, fuelLevel, note) =>
            returnMutation.mutate({ id: trip.id, odometerReading, fuelLevel, note })
          }
          onReview={(rating, comment) => reviewMutation.mutate({ id: trip.id, rating, comment })}
          sheet={sheet}
          trip={trip}
        />
      ) : null}
    </SafeAreaView>
  );
}

function VehicleSummary({ trip }: { trip: RenterTrip }) {
  const imageUrl = getVehicleImageVariantUrl(trip.vehicle.imageUrl, 'thumbnail');
  return (
    <View style={styles.vehicleCard}>
      {imageUrl ? <CachedVehicleImage style={styles.vehicleImage} uri={imageUrl} /> : <View style={styles.imageFallback}><CarFront color="#102550" size={34} /></View>}
      <View style={styles.vehicleCopy}>
        <Text style={styles.vehicleName}>{trip.vehicle.make} {trip.vehicle.model}</Text>
        <Text selectable style={styles.reference}>Ref {trip.reference}</Text>
        <Text style={styles.totalAmount}>{formatMoney(trip.pricing.totalPrice)}</Text>
      </View>
    </View>
  );
}

function StatusBanner({ trip }: { trip: RenterTrip }) {
  const copy = useMemo(() => {
    switch (trip.stage) {
      case 'upcoming': case 'confirmed': return 'Your booking is confirmed. Pickup details are available below.';
      case 'active': return 'Your rental is active. Return the vehicle using the return flow when you are ready.';
      case 'return_pending': return 'The return has been recorded and is awaiting the host inspection.';
      case 'completed': return 'Your trip is complete. Review the vehicle or open your receipt.';
      case 'cancelled': return 'This booking has been cancelled. Refund information is shown below when available.';
      case 'disputed': return 'An issue has been reported. The booking team will review the dispute.';
      default: return 'We are preparing your booking details.';
    }
  }, [trip.stage]);
  return <View style={[styles.statusBanner, statusBannerStyle(trip.stage)]}><CheckCircle2 color={statusColor(trip.stage)} size={20} /><View style={styles.statusCopy}><Text style={[styles.statusTitle, { color: statusColor(trip.stage) }]}>{tripTitle(trip.stage)}</Text><Text style={styles.statusBody}>{copy}</Text></View></View>;
}

function RentalWindow({ trip }: { trip: RenterTrip }) {
  return <Section title="Rental window"><InfoRow icon={<CalendarClock color="#0B6FE8" size={18} />} label="Pickup" value={formatDateTime(trip.pickupAt)} /><InfoRow icon={<CalendarClock color="#0B6FE8" size={18} />} label="Return" value={formatDateTime(trip.returnAt)} /></Section>;
}

function PickupDetails({ trip, onContactHost }: { trip: RenterTrip; onContactHost: () => void }) {
  if (!trip.capabilities.viewPickupInformation) return null;
  const location = [trip.pickup.location.name, trip.pickup.location.address, trip.pickup.location.city, trip.pickup.location.state, trip.pickup.location.country].filter(Boolean).join(', ');
  return <Section title="Pickup details"><InfoRow icon={<MapPin color="#0B6FE8" size={18} />} label="Pickup location" value={location || 'Pickup location will be shared before your trip.'} /><InfoRow icon={<CarFront color="#0B6FE8" size={18} />} label="Host" value={trip.pickup.hostName} />{trip.pickup.hostPhoneNumber ? <ActionButton icon={<Phone color="#0B6FE8" size={18} />} label="Contact host" onPress={onContactHost} /> : null}{trip.pickup.verifiedAt ? <InfoRow icon={<CheckCircle2 color="#15803D" size={18} />} label="Pickup verified" value={formatDateTime(trip.pickup.verifiedAt)} /> : <Text style={styles.helper}>The host will verify pickup before your trip begins.</Text>}</Section>;
}

function PaymentDetails({ isLoading, payment, trip }: { isLoading: boolean; payment?: Awaited<ReturnType<typeof bookingsApi.findPayment>>; trip: RenterTrip }) {
  return <Section title="Payment and refund">{isLoading ? <View style={styles.inlineLoading}><ActivityIndicator color="#0B6FE8" size="small" /><Text style={styles.mutedText}>Loading payment status</Text></View> : <><InfoRow icon={<CircleDollarSign color="#0B6FE8" size={18} />} label="Payment status" value={titleCase(payment?.status ?? trip.paymentStatus)} /><InfoRow label="Trip total" value={formatMoney(trip.pricing.totalPrice)} />{payment?.failureMessage ? <Text style={styles.errorText}>{payment.failureMessage}</Text> : null}{payment?.refunds.map((refund) => <InfoRow key={refund.id} label="Refund" value={`${formatMoney(refund.amount)} · ${titleCase(refund.status)}`} />)}</>}</Section>;
}

function LifecycleDetails({ trip }: { trip: RenterTrip }) {
  const { cancellation, dispute, review, return: returnInfo } = trip;
  if (trip.capabilities.viewCancellationRefund && cancellation) return <Section title="Cancellation and refund"><InfoRow icon={<XCircle color="#B91C1C" size={18} />} label="Cancellation" value={cancellation.reason ?? 'Cancelled'} />{cancellation.refundAmount ? <InfoRow icon={<CircleDollarSign color="#0B6FE8" size={18} />} label="Refund" value={`${formatMoney(cancellation.refundAmount)} · ${titleCase(cancellation.refundStatus)}`} /> : <Text style={styles.helper}>Refund details will appear here when processed.</Text>}</Section>;
  if (trip.capabilities.viewDisputeStatus && dispute) return <Section title="Issue report"><InfoRow icon={<MessageCircleWarning color="#C2410C" size={18} />} label="Status" value={titleCase(dispute.status)} /><InfoRow label="Reported issue" value={dispute.reason} /></Section>;
  if (trip.capabilities.viewReturnStatus) return <Section title="Return status"><InfoRow icon={<ClipboardCheck color="#A16207" size={18} />} label="Vehicle return" value={returnInfo.returnedAt ? `Recorded ${formatDateTime(returnInfo.returnedAt)}` : 'Return is being recorded'} /><InfoRow label="Inspection" value={titleCase(returnInfo.inspectionStatus)} /></Section>;
  if (review) return <Section title="Your review"><InfoRow icon={<Star color="#EAB308" size={18} />} label={`${review.rating} of 5`} value={titleCase(review.status)} />{review.comment ? <Text style={styles.helper}>{review.comment}</Text> : null}</Section>;
  return null;
}

function TripActions({ isMutating, onCancel, onExtend, onIssue, onReturn, onReview, onViewReceipt, receiptLoading, trip }: { isMutating: boolean; onCancel: () => void; onExtend: () => void; onIssue: () => void; onReturn: () => void; onReview: () => void; onViewReceipt: () => void; receiptLoading: boolean; trip: RenterTrip }) {
  const actions = getTripActionVisibility(trip);
  const anyAction = actions.cancel || actions.requestExtension || actions.viewReturnInstructions || actions.reportIssue || actions.review || actions.viewReceipt;
  if (!anyAction) return null;
  return <Section title="Trip actions"><View style={styles.actionStack}>{actions.requestExtension ? <ActionButton disabled={isMutating} icon={<RotateCw color="#0B6FE8" size={18} />} label="Request extension" onPress={onExtend} /> : null}{actions.viewReturnInstructions ? <><View style={styles.instruction}><Text style={styles.instructionTitle}>Return instructions</Text><Text style={styles.helper}>Park at the agreed return point, note the odometer and fuel level, then submit the return for host inspection.</Text></View><ActionButton disabled={isMutating} icon={<ClipboardCheck color="#0B6FE8" size={18} />} label="Return vehicle" onPress={onReturn} /></> : null}{actions.reportIssue ? <ActionButton disabled={isMutating} icon={<MessageCircleWarning color="#C2410C" size={18} />} label="Report an issue" onPress={onIssue} variant="warning" /> : null}{actions.review ? <ActionButton disabled={isMutating} icon={<Star color="#0B6FE8" size={18} />} label="Leave a review" onPress={onReview} /> : null}{actions.viewReceipt ? <ActionButton disabled={isMutating || receiptLoading} icon={<ReceiptText color="#0B6FE8" size={18} />} label={receiptLoading ? 'Loading receipt' : 'View receipt'} onPress={onViewReceipt} /> : null}{actions.cancel ? <ActionButton disabled={isMutating} icon={<XCircle color="#B91C1C" size={18} />} label={isMutating ? 'Updating trip' : 'Cancel booking'} onPress={onCancel} variant="danger" /> : null}</View></Section>;
}

function ReceiptDetails({ receipt }: { receipt: Awaited<ReturnType<typeof bookingsApi.findReceipt>> }) {
  return <Section title="Receipt"><InfoRow icon={<ReceiptText color="#0B6FE8" size={18} />} label="Reference" value={receipt.reference} /><InfoRow label="Issued" value={formatDate(receipt.issuedAt)} /><InfoRow label="Payment" value={titleCase(receipt.paymentStatus)} /><InfoRow label="Total" value={formatMoney(receipt.pricing.totalPrice)} /></Section>;
}

function TripActionSheets({ isSubmitting, onClose, onExtend, onReportIssue, onReturn, onReview, sheet, trip }: { isSubmitting: boolean; onClose: () => void; onExtend: (returnAt: string) => void; onReportIssue: (reason: string) => void; onReturn: (odometer: number, fuel: FuelLevel, note?: string) => void; onReview: (rating: number, comment?: string) => void; sheet: SheetName; trip: RenterTrip }) {
  return <>{sheet === 'extend' ? <ExtendSheet currentReturnAt={trip.returnAt} isSubmitting={isSubmitting} onClose={onClose} onSubmit={onExtend} /> : null}{sheet === 'return' ? <ReturnSheet isSubmitting={isSubmitting} onClose={onClose} onSubmit={onReturn} /> : null}{sheet === 'issue' ? <IssueSheet isSubmitting={isSubmitting} onClose={onClose} onSubmit={onReportIssue} /> : null}{sheet === 'review' ? <ReviewSheet isSubmitting={isSubmitting} onClose={onClose} onSubmit={onReview} /> : null}</>;
}

function ExtendSheet({ currentReturnAt, isSubmitting, onClose, onSubmit }: { currentReturnAt: string; isSubmitting: boolean; onClose: () => void; onSubmit: (returnAt: string) => void }) {
  const initial = useMemo(() => { const current = new Date(currentReturnAt); return new Date(Math.max(current.getTime() + 86_400_000, Date.now() + 86_400_000)); }, [currentReturnAt]);
  const [value, setValue] = useState(initial);
  return <ActionSheet title="Request extension" isSubmitting={isSubmitting} onClose={onClose}><Text style={styles.sheetBody}>Choose the new return date. The current return time is retained.</Text><DateTimePicker display={Platform.OS === 'ios' ? 'inline' : 'default'} minimumDate={initial} mode="date" onChange={(_, date) => date && setValue(date)} value={value} /><ActionButton disabled={isSubmitting} label={isSubmitting ? 'Sending request' : 'Request extension'} onPress={() => onSubmit(value.toISOString())} variant="primary" /></ActionSheet>;
}

function ReturnSheet({ isSubmitting, onClose, onSubmit }: { isSubmitting: boolean; onClose: () => void; onSubmit: (odometer: number, fuel: FuelLevel, note?: string) => void }) {
  const [odometer, setOdometer] = useState(''); const [fuel, setFuel] = useState<FuelLevel>('full'); const [note, setNote] = useState(''); const valid = Number.isInteger(Number(odometer)) && Number(odometer) >= 0;
  return <ActionSheet title="Return vehicle" isSubmitting={isSubmitting} onClose={onClose}><Text style={styles.sheetBody}>Record the dashboard odometer and the fuel level before handing the vehicle back.</Text><Field label="Odometer reading"><TextInput accessibilityHint="Enter the current whole-number odometer reading." accessibilityLabel="Odometer reading" keyboardType="number-pad" onChangeText={setOdometer} placeholder="e.g. 12540" style={styles.input} value={odometer} /></Field><Text style={styles.fieldLabel}>Fuel level</Text><View accessibilityLabel="Fuel level" accessibilityRole="radiogroup" style={styles.chips}>{fuelOptions.map((option) => <Pressable accessibilityLabel={option.label} accessibilityRole="radio" accessibilityState={{ selected: fuel === option.value }} key={option.value} onPress={() => setFuel(option.value)} style={[styles.chip, fuel === option.value && styles.selectedChip]}><Text style={[styles.chipText, fuel === option.value && styles.selectedChipText]}>{option.label}</Text></Pressable>)}</View><Field label="Note (optional)"><TextInput accessibilityLabel="Return note" multiline onChangeText={setNote} placeholder="Anything the host should know" style={[styles.input, styles.textarea]} value={note} /></Field><ActionButton disabled={!valid || isSubmitting} label={isSubmitting ? 'Submitting return' : 'Submit return'} onPress={() => onSubmit(Number(odometer), fuel, note.trim() || undefined)} variant="primary" /></ActionSheet>;
}

function IssueSheet({ isSubmitting, onClose, onSubmit }: { isSubmitting: boolean; onClose: () => void; onSubmit: (reason: string) => void }) {
  const [reason, setReason] = useState(''); return <ActionSheet title="Report an issue" isSubmitting={isSubmitting} onClose={onClose}><Text style={styles.sheetBody}>Describe the issue clearly. This opens a case with the booking team.</Text><Field label="What happened?"><TextInput accessibilityLabel="Describe the issue" autoFocus multiline onChangeText={setReason} placeholder="Describe the issue" style={[styles.input, styles.largeTextarea]} value={reason} /></Field><ActionButton disabled={!reason.trim() || isSubmitting} label={isSubmitting ? 'Sending report' : 'Submit issue report'} onPress={() => onSubmit(reason.trim())} variant="warning" /></ActionSheet>;
}

function ReviewSheet({ isSubmitting, onClose, onSubmit }: { isSubmitting: boolean; onClose: () => void; onSubmit: (rating: number, comment?: string) => void }) {
  const [rating, setRating] = useState(0); const [comment, setComment] = useState(''); return <ActionSheet title="Review your trip" isSubmitting={isSubmitting} onClose={onClose}><Text style={styles.sheetBody}>How was the vehicle?</Text><View accessibilityLabel="Trip rating" accessibilityRole="radiogroup" style={styles.ratingRow}>{[1,2,3,4,5].map((value) => <Pressable accessibilityLabel={`${value} stars`} accessibilityRole="radio" accessibilityState={{ selected: value === rating }} key={value} onPress={() => setRating(value)} style={styles.starButton}><Star color={value <= rating ? '#EAB308' : '#D6E8FF'} fill={value <= rating ? '#EAB308' : 'transparent'} size={32} /></Pressable>)}</View><Field label="Comment (optional)"><TextInput accessibilityLabel="Trip review comment" multiline onChangeText={setComment} placeholder="Tell us about your trip" style={[styles.input, styles.textarea]} value={comment} /></Field><ActionButton disabled={rating === 0 || isSubmitting} label={isSubmitting ? 'Submitting review' : 'Submit review'} onPress={() => onSubmit(rating, comment.trim() || undefined)} variant="primary" /></ActionSheet>;
}

function ActionSheet({ children, isSubmitting, onClose, title }: { children: React.ReactNode; isSubmitting: boolean; onClose: () => void; title: string }) {
  return <Modal animationType="slide" onRequestClose={onClose} transparent visible><KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.modalOverlay}><Pressable accessible={false} disabled={isSubmitting} onPress={onClose} style={styles.backdrop} /><SafeAreaView accessibilityLabel={title} accessibilityViewIsModal edges={['bottom']} style={styles.sheet}><View style={styles.handle} /><View style={styles.sheetHeader}><Text accessibilityRole="header" style={styles.sheetTitle}>{title}</Text><Pressable accessibilityLabel={`Close ${title}`} accessibilityRole="button" disabled={isSubmitting} onPress={onClose} style={styles.closeButton}><Text style={styles.closeText}>Close</Text></Pressable></View><ScrollView contentContainerStyle={styles.sheetContent} keyboardShouldPersistTaps="handled">{children}</ScrollView></SafeAreaView></KeyboardAvoidingView></Modal>;
}

function Section({ children, title }: { children: React.ReactNode; title: string }) { return <View style={styles.section}><Text style={styles.sectionTitle}>{title}</Text>{children}</View>; }
function Field({ children, label }: { children: React.ReactNode; label: string }) { return <View style={styles.field}><Text style={styles.fieldLabel}>{label}</Text>{children}</View>; }
function InfoRow({ icon, label, value }: { icon?: React.ReactNode; label: string; value: string }) { return <View style={styles.infoRow}><View style={styles.infoLabelWrap}>{icon}<Text style={styles.infoLabel}>{label}</Text></View><Text style={styles.infoValue}>{value}</Text></View>; }
function ActionButton({ disabled, icon, label, onPress, variant = 'default' }: { disabled?: boolean; icon?: React.ReactNode; label: string; onPress: () => void; variant?: 'default' | 'danger' | 'warning' | 'primary' }) { return <Pressable accessibilityLabel={label} accessibilityRole="button" accessibilityState={{ disabled: Boolean(disabled) }} disabled={disabled} onPress={onPress} style={({ pressed }) => [styles.actionButton, variant === 'danger' && styles.dangerButton, variant === 'warning' && styles.warningButton, variant === 'primary' && styles.primaryButton, disabled && styles.disabled, pressed && !disabled && styles.pressed]}>{icon}{<Text style={[styles.actionText, variant === 'danger' && styles.dangerText, variant === 'warning' && styles.warningText, variant === 'primary' && styles.primaryText]}>{label}</Text>}</Pressable>; }
function LoadingState() { return <View style={styles.loadingState}><ActivityIndicator color="#0B6FE8" /><Text style={styles.mutedText}>Loading trip</Text></View>; }
function StateMessage({ actionLabel, body, onAction, title }: { actionLabel?: string; body: string; onAction?: () => void; title: string }) { return <View style={styles.state}><Text style={styles.stateTitle}>{title}</Text><Text style={styles.stateBody}>{body}</Text>{actionLabel && onAction ? <Pressable accessibilityRole="button" onPress={onAction} style={styles.retryButton}><Text style={styles.retryText}>{actionLabel}</Text></Pressable> : null}</View>; }
function showRequestError(error: unknown) { Alert.alert('Trip update failed', normalizeApiError(error).message); }
function statusColor(stage: RenterTrip['stage']) { if (stage === 'cancelled') return '#B91C1C'; if (stage === 'disputed') return '#C2410C'; if (stage === 'return_pending') return '#A16207'; if (stage === 'active') return '#15803D'; return '#0B6FE8'; }
function statusBannerStyle(stage: RenterTrip['stage']) { if (stage === 'cancelled') return styles.cancelledBanner; if (stage === 'disputed') return styles.disputedBanner; if (stage === 'return_pending') return styles.returnBanner; if (stage === 'active') return styles.activeBanner; return styles.defaultBanner; }

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#F3F9FF', flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 76, paddingHorizontal: 16 },
  headerCopy: { flex: 1 }, eyebrow: { color: '#536B91', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' }, title: { color: '#102550', fontSize: 22, fontWeight: '900' },
  iconButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 12, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  content: { gap: 12, padding: 16, paddingBottom: 28 }, vehicleCard: { backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14 }, vehicleImage: { backgroundColor: '#F3F9FF', borderRadius: 12, height: 100, width: 118 }, imageFallback: { alignItems: 'center', backgroundColor: '#EAF4FF', borderRadius: 12, height: 100, justifyContent: 'center', width: 118 }, vehicleCopy: { flex: 1, gap: 7, justifyContent: 'center', minWidth: 0 }, vehicleName: { color: '#102550', fontSize: 18, fontWeight: '900' }, reference: { color: '#536B91', fontSize: 12, fontWeight: '700' }, totalAmount: { color: '#0B6FE8', fontSize: 18, fontWeight: '900' },
  statusBanner: { alignItems: 'flex-start', borderRadius: 14, flexDirection: 'row', gap: 10, padding: 14 }, defaultBanner: { backgroundColor: '#EAF4FF' }, activeBanner: { backgroundColor: '#E9F9EE' }, returnBanner: { backgroundColor: '#FFF8DD' }, cancelledBanner: { backgroundColor: '#FEF0F0' }, disputedBanner: { backgroundColor: '#FFF1E8' }, statusCopy: { flex: 1, gap: 3 }, statusTitle: { fontSize: 15, fontWeight: '900', textTransform: 'capitalize' }, statusBody: { color: '#536B91', fontSize: 13, fontWeight: '600', lineHeight: 19 },
  section: { backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 16, borderWidth: 1, gap: 10, padding: 14 }, sectionTitle: { color: '#102550', fontSize: 17, fontWeight: '900' }, infoRow: { borderTopColor: '#EAF4FF', borderTopWidth: 1, gap: 4, paddingTop: 10 }, infoLabelWrap: { alignItems: 'center', flexDirection: 'row', gap: 7 }, infoLabel: { color: '#536B91', fontSize: 12, fontWeight: '800' }, infoValue: { color: '#102550', fontSize: 14, fontWeight: '800', lineHeight: 20 }, helper: { color: '#536B91', fontSize: 13, fontWeight: '600', lineHeight: 19 }, errorText: { color: '#B91C1C', fontSize: 13, fontWeight: '700' },
  actionStack: { gap: 9 }, actionButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#BFDBFE', borderRadius: 12, borderWidth: 1, flexDirection: 'row', gap: 8, justifyContent: 'center', minHeight: 46, paddingHorizontal: 14 }, actionText: { color: '#0B6FE8', fontSize: 14, fontWeight: '900' }, dangerButton: { backgroundColor: '#FEF2F2', borderColor: '#FECACA' }, dangerText: { color: '#B91C1C' }, warningButton: { backgroundColor: '#FFF7ED', borderColor: '#FED7AA' }, warningText: { color: '#C2410C' }, primaryButton: { backgroundColor: '#0B6FE8', borderColor: '#0B6FE8' }, primaryText: { color: '#FFFFFF' }, instruction: { backgroundColor: '#F3F9FF', borderRadius: 10, gap: 4, padding: 12 }, instructionTitle: { color: '#102550', fontSize: 13, fontWeight: '900' },
  inlineLoading: { alignItems: 'center', flexDirection: 'row', gap: 8, paddingVertical: 6 }, mutedText: { color: '#536B91', fontSize: 14, fontWeight: '700' }, loadingState: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center' }, state: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center', padding: 28 }, stateTitle: { color: '#102550', fontSize: 20, fontWeight: '900', textAlign: 'center' }, stateBody: { color: '#536B91', fontSize: 14, fontWeight: '600', lineHeight: 21, textAlign: 'center' }, retryButton: { backgroundColor: '#0B6FE8', borderRadius: 12, justifyContent: 'center', marginTop: 4, minHeight: 44, paddingHorizontal: 18 }, retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  modalOverlay: { flex: 1, justifyContent: 'flex-end' }, backdrop: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15, 23, 42, 0.42)' }, sheet: { backgroundColor: '#FFFFFF', borderTopLeftRadius: 24, borderTopRightRadius: 24, maxHeight: '88%' }, handle: { alignSelf: 'center', backgroundColor: '#D6E8FF', borderRadius: 3, height: 5, marginTop: 10, width: 42 }, sheetHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16 }, sheetTitle: { color: '#102550', fontSize: 20, fontWeight: '900' }, closeButton: { alignItems: 'center', justifyContent: 'center', minHeight: 40, paddingHorizontal: 4 }, closeText: { color: '#0B6FE8', fontSize: 14, fontWeight: '900' }, sheetContent: { gap: 14, padding: 20, paddingBottom: 30 }, sheetBody: { color: '#536B91', fontSize: 14, fontWeight: '600', lineHeight: 21 }, field: { gap: 6 }, fieldLabel: { color: '#536B91', fontSize: 13, fontWeight: '900' }, input: { backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 12, borderWidth: 1, color: '#102550', fontSize: 16, fontWeight: '700', minHeight: 48, paddingHorizontal: 13 }, textarea: { minHeight: 88, paddingTop: 12, textAlignVertical: 'top' }, largeTextarea: { minHeight: 128, paddingTop: 12, textAlignVertical: 'top' }, chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 }, chip: { borderColor: '#D6E8FF', borderRadius: 10, borderWidth: 1, minHeight: 40, justifyContent: 'center', paddingHorizontal: 11 }, selectedChip: { backgroundColor: '#EAF4FF', borderColor: '#0B6FE8' }, chipText: { color: '#536B91', fontSize: 13, fontWeight: '800' }, selectedChipText: { color: '#0B6FE8' }, ratingRow: { flexDirection: 'row', justifyContent: 'space-between' }, starButton: { alignItems: 'center', height: 48, justifyContent: 'center', width: 48 }, disabled: { opacity: 0.52 }, pressed: { opacity: 0.75 },
});
