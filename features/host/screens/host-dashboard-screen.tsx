import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  CalendarCheck2,
  CarFront,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileSearch,
  Landmark,
  Plus,
  ShieldCheck,
  WalletCards,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CachedVehicleImage } from '@/features/customer/components/cached-vehicle-image';
import { formatMoney, getVehicleImageVariantUrl } from '@/features/customer/utils/car-formatters';
import { HostBottomNavigation } from '@/features/host/components/host-bottom-navigation';
import {
  getVehicleDraftName,
  getVehicleSetupProgress,
  getVehicleSetupSectionLabel,
} from '@/features/host-vehicles/utils/vehicle-setup-progress';
import { hostsApi, type HostSetupStatus, type HostSetupTaskKey } from '@/services/hosts/hosts-api';
import { type HostBooking, type HostEarningEntry, type HostVehicleListing } from '@/types/car';
import { normalizeApiError } from '@/utils/errors';

export function HostDashboardScreen() {
  const dashboardQuery = useQuery({
    queryKey: ['host', 'dashboard'],
    queryFn: hostsApi.dashboard,
  });
  const setupQuery = useQuery({
    queryKey: ['host', 'setup-status'],
    queryFn: hostsApi.setupStatus,
  });
  const vehiclesQuery = useQuery({
    queryKey: ['host', 'vehicles'],
    queryFn: hostsApi.listVehicles,
  });
  const bookingsQuery = useQuery({ queryKey: ['host', 'bookings'], queryFn: hostsApi.listBookings });
  const earningsQuery = useQuery({
    queryKey: ['host', 'earnings', 'dashboard'],
    queryFn: () => hostsApi.earnings({ limit: 5, page: 1 }),
  });
  const listingDrafts = useMemo(() => getListingDrafts(vehiclesQuery.data ?? []), [vehiclesQuery.data]);
  const activeListings = useMemo(
    () => (vehiclesQuery.data ?? []).filter((vehicle) => vehicle.status === 'PUBLISHED' || vehicle.status === 'PAUSED'),
    [vehiclesQuery.data],
  );
  const isNewHost = vehiclesQuery.isSuccess && (vehiclesQuery.data?.length ?? 0) === 0;
  const hasActiveListings = activeListings.length > 0;
  const activity = useMemo(
    () => getRecentActivity(vehiclesQuery.data ?? [], bookingsQuery.data ?? [], earningsQuery.data?.items ?? []),
    [bookingsQuery.data, earningsQuery.data?.items, vehiclesQuery.data],
  );
  const isRefreshing =
    (dashboardQuery.isRefetching && !dashboardQuery.isLoading) ||
    (setupQuery.isRefetching && !setupQuery.isLoading) ||
    (vehiclesQuery.isRefetching && !vehiclesQuery.isLoading) ||
    (bookingsQuery.isRefetching && !bookingsQuery.isLoading) ||
    (earningsQuery.isRefetching && !earningsQuery.isLoading);
  const refreshDashboard = () => {
    void dashboardQuery.refetch();
    void setupQuery.refetch();
    void vehiclesQuery.refetch();
    void bookingsQuery.refetch();
    void earningsQuery.refetch();
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <View>
            <Text style={styles.eyebrow}>Host workspace</Text>
            <Text style={styles.title}>Dashboard</Text>
          </View>
          <View style={styles.headerActions}>
            <Pressable accessibilityLabel="Add a vehicle" accessibilityRole="button" onPress={() => router.push('/(host)/vehicles/new')} style={styles.addVehicleButton}>
              <Plus color="#FFFFFF" size={18} />
              <Text style={styles.addVehicleText}>Add car</Text>
            </Pressable>
          </View>
        </View>

        {dashboardQuery.isLoading ? (
          <LoadingState />
        ) : dashboardQuery.isError ? (
          <StateMessage
            actionLabel="Try again"
            body={normalizeApiError(dashboardQuery.error).message}
            onAction={() => void dashboardQuery.refetch()}
            title="Dashboard could not load"
          />
        ) : dashboardQuery.data ? (
          <ScrollView
            contentContainerStyle={styles.content}
            refreshControl={
              <RefreshControl
                onRefresh={refreshDashboard}
                refreshing={isRefreshing}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            {isNewHost ? <NewHostWelcome /> : null}
            {vehiclesQuery.isError ? <InlineIssue label="Listings could not load." onRetry={() => void vehiclesQuery.refetch()} /> : null}
            {listingDrafts.length ? <DraftListingsSection drafts={listingDrafts} /> : null}
            {setupQuery.data?.status !== 'complete' ? <HostSetupChecklist draft={listingDrafts[0] ?? null} setup={setupQuery.data} isLoading={setupQuery.isLoading} onRetry={() => void setupQuery.refetch()} /> : null}
            {isNewHost ? <NewHostEmptyState /> : null}
            {hasActiveListings ? <EarningsSummary data={earningsQuery.data} isError={earningsQuery.isError} isLoading={earningsQuery.isLoading} onView={() => router.push('/(host)/earnings' as never)} /> : null}
            {!isNewHost ? <><Text style={styles.sectionTitle}>Overview</Text><View style={styles.metrics}>
              <MetricCard
                icon={<CarFront color="#0B6FE8" size={20} />}
                label="Active listings"
                value={String(dashboardQuery.data.activeListings)}
                onPress={() => router.push('/(host)/cars' as never)}
              />
              <MetricCard
                icon={<FileSearch color="#FF644F" size={20} />}
                label="In review"
                value={String(dashboardQuery.data.pendingListingReviews)}
                onPress={() => router.push({ pathname: '/(host)/cars', params: { tab: 'pending' } } as never)}
              />
              <MetricCard
                icon={<CalendarCheck2 color="#0B6FE8" size={20} />}
                label="Booking requests"
                value={String(dashboardQuery.data.bookingRequests)}
                onPress={() => router.push({ pathname: '/(host)/bookings', params: { tab: 'requests' } } as never)}
              />
              <MetricCard
                icon={<Clock3 color="#536B91" size={20} />}
                label="Active trips"
                value={String(dashboardQuery.data.activeTrips)}
                onPress={() => router.push({ pathname: '/(host)/bookings', params: { tab: 'active' } } as never)}
              />
            </View></> : null}
            {!isNewHost ? <RecentActivity activity={activity} isError={bookingsQuery.isError} isLoading={bookingsQuery.isLoading || vehiclesQuery.isLoading} onRetry={() => void bookingsQuery.refetch()} /> : null}
          </ScrollView>
        ) : null}
      </View>
      <HostBottomNavigation />
    </SafeAreaView>
  );
}

function NewHostWelcome() {
  return <View style={styles.welcomeCard}><View style={styles.welcomeIcon}><CarFront color="#0B6FE8" size={23} /></View><View style={styles.welcomeCopy}><Text style={styles.welcomeTitle}>Welcome to hosting</Text><Text style={styles.welcomeBody}>Start with your first car, then finish identity and payout setup when you are ready.</Text></View></View>;
}

function NewHostEmptyState() {
  return <View style={styles.emptyCard}><CarFront color="#0B6FE8" size={28} /><Text style={styles.emptyTitle}>Your host workspace is ready</Text><Text style={styles.emptyBody}>Add a vehicle to create your first listing draft. You can save and return at any time.</Text><Pressable accessibilityRole="button" onPress={() => router.push('/(host)/vehicles/new')} style={styles.emptyAction}><Plus color="#FFFFFF" size={18} /><Text style={styles.emptyActionText}>Add your first car</Text></Pressable></View>;
}

function InlineIssue({ label, onRetry }: { label: string; onRetry: () => void }) {
  return <View style={styles.inlineIssue}><Text style={styles.inlineIssueText}>{label}</Text><Pressable accessibilityRole="button" onPress={onRetry} style={styles.inlineIssueAction}><Text style={styles.inlineIssueActionText}>Retry</Text></Pressable></View>;
}

function DraftListingsSection({ drafts }: { drafts: HostVehicleListing[] }) {
  return <View style={styles.draftSection}><View style={styles.sectionHeadingRow}><View><Text style={styles.sectionEyebrow}>Listing setup</Text><Text style={styles.sectionTitle}>Continue your listing</Text></View><Text style={styles.draftCount}>{drafts.length} {drafts.length === 1 ? 'draft' : 'drafts'}</Text></View>{drafts.map((vehicle) => <VehicleDraftCard key={vehicle.id} vehicle={vehicle} />)}</View>;
}

function VehicleDraftCard({ vehicle }: { vehicle: HostVehicleListing }) {
  const progress = getVehicleSetupProgress(vehicle);
  const name = getVehicleDraftName(vehicle);
  const next = getVehicleSetupSectionLabel(progress.nextSection);
  const imageUrl = getVehicleImageVariantUrl(vehicle.imageUrls[0], 'thumbnail');
  const resume = () => router.push({ pathname: '/(host)/vehicles/new', params: { flow: 'guided', section: progress.nextSection, vehicleId: vehicle.id } });
  return <View style={styles.draftCard}><View style={styles.draftHeader}>{imageUrl ? <CachedVehicleImage accessibilityLabel={`${name} photo`} style={styles.draftImage} uri={imageUrl} /> : <View style={styles.draftImageFallback}><CarFront color="#0B6FE8" size={24} /></View>}<View style={styles.draftCopy}><View style={styles.draftTitleRow}><Text numberOfLines={1} style={styles.draftTitle}>{name}</Text><Text style={styles.draftStatus}>{vehicle.status === 'CHANGES_REQUIRED' ? 'Action required' : 'Draft'}</Text></View><Text style={styles.draftProgressText}>{progress.percentage}% complete · Next: {next}</Text><View style={styles.progressTrack}><View style={[styles.progressFill, { width: `${Math.max(5, progress.percentage)}%` }]} /></View></View></View><Pressable accessibilityHint={`Resumes at ${next}`} accessibilityLabel={`Continue setup for ${name}`} accessibilityRole="button" onPress={resume} style={({ pressed }) => [styles.draftAction, pressed && styles.pressed]}><Text style={styles.draftActionText}>Continue setup</Text><ChevronRight color="#FFFFFF" size={18} /></Pressable></View>;
}

function HostSetupChecklist({
  draft,
  isLoading,
  onRetry,
  setup,
}: {
  draft: HostVehicleListing | null;
  isLoading: boolean;
  onRetry: () => void;
  setup: HostSetupStatus | undefined;
}) {
  const [expanded, setExpanded] = useState(false);
  if (isLoading) {
    return (
      <View style={styles.setupCard}>
        <ActivityIndicator color="#0B6FE8" />
        <Text style={styles.setupLoadingText}>Checking host setup</Text>
      </View>
    );
  }

  if (!setup) {
    return (
      <View style={styles.setupCard}>
        <Text style={styles.setupTitle}>Finish your host setup</Text>
        <Text style={styles.setupBody}>We could not load your setup progress.</Text>
        <Pressable accessibilityRole="button" onPress={onRetry} style={styles.setupRetryButton}>
          <Text style={styles.setupRetryText}>Try again</Text>
        </Pressable>
      </View>
    );
  }

  const hasProgress = setup.completedTasks > 1;
  const completedTasks = setup.tasks.filter((task) => task.status === 'completed');
  const remainingTasks = setup.tasks.filter((task) => task.status !== 'completed');
  const completedTaskNames = completedTasks.map((task) => setupTaskDefinition(task.key, task.status, draft).title);
  const remainingTaskNames = remainingTasks.map((task) => {
    const title = setupTaskDefinition(task.key, task.status, draft).title;
    const status = task.status === 'under_review'
      ? 'under review'
      : task.status === 'action_required'
        ? 'action required'
        : 'pending';
    return `${title} (${status})`;
  });
  const checklistTasks = draft ? setup.tasks.filter((task) => task.key !== 'first_car') : setup.tasks;
  const visibleTasks = !hasProgress || expanded ? checklistTasks : checklistTasks.filter((task) => task.status !== 'completed');

  return (
    <View style={styles.setupCard}>
      <View style={styles.setupHeader}>
        <View>
          <Text style={styles.setupEyebrow}>Setup in progress</Text>
          <Text style={styles.setupTitle}>Complete your host setup</Text>
        </View>
        <View style={styles.progressBadge}>
          <Text style={styles.progressText}>{setup.completedTasks}/{setup.totalTasks}</Text>
        </View>
      </View>
      <Text style={styles.setupProgressSummary}>{setup.completedTasks} of {setup.totalTasks} setup tasks completed · {remainingTasks.length} remaining</Text>
      <Text style={styles.setupBody}>{completedTaskNames.length ? `Completed: ${completedTaskNames.join(', ')}.` : 'No host setup tasks are complete yet.'}</Text>
      {remainingTaskNames.length ? <Text style={styles.setupRemainingText}>Remaining: {remainingTaskNames.join(', ')}.</Text> : null}
      {remainingTasks.some((task) => task.status === 'under_review') ? <Text style={styles.setupReviewHint}>We’re reviewing the items marked under review. No action is needed unless we request more information.</Text> : null}
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(8, (setup.completedTasks / setup.totalTasks) * 100)}%` }]} />
      </View>
      <View style={styles.checklist}>
        {visibleTasks.map((task) => <SetupTask draft={draft} key={task.key} status={task.status} taskKey={task.key} />)}
      </View>
      {hasProgress ? <Pressable accessibilityRole="button" onPress={() => setExpanded((value) => !value)} style={styles.checklistToggle}><Text style={styles.checklistToggleText}>{expanded ? 'Hide completed tasks' : 'Show setup tasks'}</Text><ChevronRight color="#0B6FE8" size={16} style={expanded ? { transform: [{ rotate: '90deg' }] } : undefined} /></Pressable> : null}
    </View>
  );
}

function SetupTask({
  draft,
  status,
  taskKey,
}: {
  draft: HostVehicleListing | null;
  status: HostSetupStatus['tasks'][number]['status'];
  taskKey: HostSetupTaskKey;
}) {
  const definition = setupTaskDefinition(taskKey, status, draft);
  const Icon = definition.icon;
  const complete = status === 'completed';
  const draftProgress = taskKey === 'first_car' && draft ? getVehicleSetupProgress(draft) : null;
  const pendingReview = status === 'under_review' && !draftProgress;
  const statusLabel = complete
    ? 'Completed'
    : draftProgress && draft
      ? `${getVehicleDraftName(draft)} · ${draftProgress.percentage}% complete · Next: ${getVehicleSetupSectionLabel(draftProgress.nextSection)}`
      : pendingReview
        ? 'Under review'
        : status === 'action_required'
          ? 'Action required'
          : 'Pending';

  return (
    <View style={styles.setupTask}>
      <View style={[styles.setupTaskIcon, complete && styles.setupTaskIconComplete]}>
        {complete ? <CheckCircle2 color="#179447" size={21} /> : <Icon color="#0B6FE8" size={20} />}
      </View>
      <View style={styles.setupTaskCopy}>
        <Text style={styles.setupTaskTitle}>{definition.title}</Text>
        <Text numberOfLines={2} style={styles.setupTaskStatus}>{statusLabel}</Text>
        {draftProgress ? (
          <View style={styles.setupTaskProgressTrack}>
            <View style={[styles.setupTaskProgressFill, { width: `${Math.max(5, draftProgress.percentage)}%` }]} />
          </View>
        ) : null}
      </View>
      {definition.action && !complete && !pendingReview ? (
        <Pressable accessibilityLabel={`${definition.action} ${definition.title}`} accessibilityRole="button" onPress={definition.onPress} style={styles.setupAction}>
          <Text style={styles.setupActionText}>{definition.action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function setupTaskDefinition(
  key: HostSetupTaskKey,
  status: HostSetupStatus['tasks'][number]['status'],
  draft: HostVehicleListing | null,
) {
  if (key === 'host_profile') return { icon: CheckCircle2, title: 'Create Host Profile' };
  if (key === 'first_car') {
    const progress = draft ? getVehicleSetupProgress(draft) : null;
    return {
      icon: CarFront,
      title: 'Add Your First Car',
      action: draft ? 'Continue' : status === 'under_review' ? undefined : 'Add Car',
      onPress: () =>
        draft && progress
          ? router.push({
              pathname: '/(host)/vehicles/new',
              params: { flow: 'guided', section: progress.nextSection, vehicleId: draft.id },
            })
          : router.push('/(host)/vehicles/new'),
    };
  }
  if (key === 'identity_verification') {
    return {
      icon: ShieldCheck,
      title: 'Verify Identity',
      action: 'Verify',
      onPress: () => router.push('/(host)/identity-verification'),
    };
  }
  return {
    icon: Landmark,
    title: 'Set Up Payouts',
    action: 'Set Up',
    onPress: () => router.push('/(host)/payout-setup'),
  };
}

function EarningsSummary({ data, isError, isLoading, onView }: { data: { thisMonthEarnings: string; pendingPayouts: string } | undefined; isError: boolean; isLoading: boolean; onView: () => void }) {
  return <View style={styles.earningsCard}><View style={styles.sectionHeadingRow}><View><Text style={styles.sectionEyebrow}>Earnings</Text><Text style={styles.sectionTitle}>This month</Text></View><Pressable accessibilityRole="button" onPress={onView} style={styles.textAction}><Text style={styles.textActionLabel}>View earnings</Text><ChevronRight color="#0B6FE8" size={16} /></Pressable></View>{isLoading ? <ActivityIndicator color="#0B6FE8" /> : isError ? <Text style={styles.inlineError}>Earnings are unavailable right now.</Text> : <View style={styles.earningsValues}><View><Text style={styles.earningsValue}>{formatMoney(data?.thisMonthEarnings ?? '0')}</Text><Text style={styles.earningsLabel}>Earned this month</Text></View><View style={styles.earningsDivider} /><View><Text style={styles.earningsValue}>{formatMoney(data?.pendingPayouts ?? '0')}</Text><Text style={styles.earningsLabel}>Pending payout</Text></View></View>}</View>;
}

type ActivityItem = { id: string; at: string; detail: string; icon: 'car' | 'booking' | 'earnings'; title: string };

function RecentActivity({ activity, isError, isLoading, onRetry }: { activity: ActivityItem[]; isError: boolean; isLoading: boolean; onRetry: () => void }) {
  return <View style={styles.activityCard}><View style={styles.sectionHeadingRow}><View><Text style={styles.sectionEyebrow}>Updates</Text><Text style={styles.sectionTitle}>Recent activity</Text></View></View>{isLoading ? <ActivityIndicator color="#0B6FE8" /> : isError ? <InlineIssue label="Recent activity could not load." onRetry={onRetry} /> : activity.length ? <View style={styles.activityList}>{activity.map((item) => <ActivityRow item={item} key={item.id} />)}</View> : <View style={styles.activityEmpty}><Clock3 color="#536B91" size={21} /><View><Text style={styles.activityEmptyTitle}>No recent activity yet</Text><Text style={styles.activityEmptyBody}>Your updates will appear here as you start hosting.</Text></View></View>}</View>;
}

function ActivityRow({ item }: { item: ActivityItem }) {
  const Icon = item.icon === 'car' ? CarFront : item.icon === 'booking' ? CalendarCheck2 : WalletCards;
  return <View style={styles.activityRow}><View style={styles.activityIcon}><Icon color="#0B6FE8" size={18} /></View><View style={styles.activityCopy}><Text style={styles.activityTitle}>{item.title}</Text><Text numberOfLines={1} style={styles.activityDetail}>{item.detail}</Text></View><Text style={styles.activityDate}>{formatActivityDate(item.at)}</Text></View>;
}

function MetricCard({ icon, label, onPress, value }: { icon: React.ReactNode; label: string; onPress?: () => void; value: string }) {
  const content = <><View style={styles.metricIcon}>{icon}</View><Text style={styles.metricLabel}>{label}</Text><Text adjustsFontSizeToFit numberOfLines={1} style={styles.metricValue}>{value}</Text></>;
  return onPress ? <Pressable accessibilityLabel={`${label}: ${value}`} accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.metricCard, pressed && styles.pressed]}>{content}</Pressable> : <View style={styles.metricCard}>{content}</View>;
}

function getListingDrafts(vehicles: HostVehicleListing[]) {
  return vehicles.filter((vehicle) => vehicle.status === 'DRAFT' || vehicle.status === 'CHANGES_REQUIRED').sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

function getRecentActivity(vehicles: HostVehicleListing[], bookings: HostBooking[], earnings: HostEarningEntry[]): ActivityItem[] {
  const vehicleActivity = vehicles.filter((vehicle) => vehicle.status !== 'DRAFT').map((vehicle) => ({ id: `vehicle-${vehicle.id}-${vehicle.updatedAt}`, at: vehicle.updatedAt, icon: 'car' as const, title: vehicle.status === 'PENDING_REVIEW' ? 'Vehicle submitted for review' : vehicle.status === 'PUBLISHED' ? 'Vehicle listing is active' : vehicle.status === 'CHANGES_REQUIRED' ? 'Vehicle changes requested' : 'Vehicle listing updated', detail: getVehicleDraftName(vehicle) }));
  const bookingActivity = bookings.map((booking) => ({ id: `booking-${booking.id}-${booking.updatedAt}`, at: booking.updatedAt, icon: 'booking' as const, title: booking.status === 'PENDING_PAYMENT' || booking.paymentStatus !== 'paid' ? 'Awaiting Payment' : booking.hostPhase === 'requests' ? 'New booking request' : booking.hostPhase === 'active' ? 'Trip is active' : booking.hostPhase === 'completed' ? 'Trip completed' : booking.hostPhase === 'cancelled' ? 'Booking cancelled' : 'Booking confirmed', detail: `${booking.vehicle.make} ${booking.vehicle.model}` }));
  const earningActivity = earnings.filter((earning) => earning.payoutStatus === 'completed').map((earning) => ({ id: `earning-${earning.id}-${earning.paidAt}`, at: earning.paidAt, icon: 'earnings' as const, title: 'Payout processed', detail: `${formatMoney(earning.hostNetAmount)} · ${earning.vehicle.make} ${earning.vehicle.model}` }));
  return [...vehicleActivity, ...bookingActivity, ...earningActivity].filter((item) => Boolean(item.at)).sort((left, right) => Date.parse(right.at) - Date.parse(left.at)).slice(0, 5);
}

function formatActivityDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat('en-IN', { day: 'numeric', month: 'short' }).format(date);
}

function LoadingState() {
  return (
    <View style={styles.state}>
      <ActivityIndicator color="#0B6FE8" />
      <Text style={styles.stateBody}>Loading dashboard</Text>
    </View>
  );
}

function StateMessage({
  actionLabel,
  body,
  onAction,
  title,
}: {
  actionLabel: string;
  body: string;
  onAction: () => void;
  title: string;
}) {
  return (
    <View style={styles.state}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      <Pressable accessibilityRole="button" onPress={onAction} style={styles.retryButton}>
        <Text style={styles.retryText}>{actionLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#F3F9FF', flex: 1 },
  screen: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 76, paddingHorizontal: 16 },
  headerActions: { alignItems: 'center', flexDirection: 'row', gap: 8 },
  iconButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 12, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  addVehicleButton: { alignItems: 'center', backgroundColor: '#0B6FE8', borderRadius: 11, flexDirection: 'row', gap: 5, justifyContent: 'center', minHeight: 44, paddingHorizontal: 12 },
  addVehicleText: { color: '#FFFFFF', fontSize: 13, fontWeight: '900' },
  eyebrow: { color: '#536B91', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#102550', fontSize: 23, fontWeight: '900' },
  content: { gap: 14, padding: 16, paddingBottom: 32 },
  welcomeCard: { alignItems: 'center', backgroundColor: '#EAF4FF', borderColor: '#D6E8FF', borderRadius: 16, borderWidth: 1, flexDirection: 'row', gap: 12, padding: 14 },
  welcomeIcon: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 12, height: 46, justifyContent: 'center', width: 46 },
  welcomeCopy: { flex: 1 },
  welcomeTitle: { color: '#102550', fontSize: 17, fontWeight: '900' },
  welcomeBody: { color: '#536B91', fontSize: 12, fontWeight: '600', lineHeight: 18, marginTop: 2 },
  emptyCard: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 16, borderStyle: 'dashed', borderWidth: 1, gap: 9, padding: 22 },
  emptyTitle: { color: '#102550', fontSize: 17, fontWeight: '900', textAlign: 'center' },
  emptyBody: { color: '#536B91', fontSize: 13, fontWeight: '600', lineHeight: 19, maxWidth: 290, textAlign: 'center' },
  emptyAction: { alignItems: 'center', backgroundColor: '#0B6FE8', borderRadius: 11, flexDirection: 'row', gap: 7, justifyContent: 'center', marginTop: 3, minHeight: 44, paddingHorizontal: 15 },
  emptyActionText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
  inlineIssue: { alignItems: 'center', backgroundColor: '#FFF8F6', borderColor: '#FFD6CF', borderRadius: 11, borderWidth: 1, flexDirection: 'row', justifyContent: 'space-between', padding: 10 },
  inlineIssueText: { color: '#536B91', flex: 1, fontSize: 12, fontWeight: '700' },
  inlineIssueAction: { minHeight: 32, justifyContent: 'center', paddingHorizontal: 8 },
  inlineIssueActionText: { color: '#0B6FE8', fontSize: 12, fontWeight: '900' },
  sectionHeadingRow: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  sectionEyebrow: { color: '#536B91', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  sectionTitle: { color: '#102550', fontSize: 18, fontWeight: '900', marginTop: 2 },
  draftSection: { gap: 10 },
  draftCount: { backgroundColor: '#EAF4FF', borderRadius: 999, color: '#0B6FE8', fontSize: 12, fontWeight: '800', paddingHorizontal: 9, paddingVertical: 5 },
  setupCard: { backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 16, borderWidth: 1, gap: 12, padding: 14 },
  setupHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  setupEyebrow: { color: '#0B6FE8', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  setupTitle: { color: '#102550', fontSize: 18, fontWeight: '900', marginTop: 2 },
  setupProgressSummary: { color: '#0B6FE8', fontSize: 13, fontWeight: '900', lineHeight: 18 },
  setupBody: { color: '#536B91', fontSize: 12, fontWeight: '600', lineHeight: 18 },
  setupRemainingText: { color: '#102550', fontSize: 12, fontWeight: '700', lineHeight: 18 },
  setupReviewHint: { color: '#536B91', fontSize: 12, fontWeight: '600', lineHeight: 18 },
  setupLoadingText: { color: '#536B91', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  setupRetryButton: { alignSelf: 'flex-start', backgroundColor: '#EAF4FF', borderRadius: 9, minHeight: 38, justifyContent: 'center', paddingHorizontal: 12 },
  setupRetryText: { color: '#0B6FE8', fontSize: 13, fontWeight: '900' },
  draftCard: { backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 16, borderWidth: 1, gap: 12, padding: 12 },
  draftHeader: { alignItems: 'center', flexDirection: 'row', gap: 10 },
  draftImage: { backgroundColor: '#EAF4FF', borderRadius: 11, height: 66, width: 78 },
  draftImageFallback: { alignItems: 'center', backgroundColor: '#EAF4FF', borderRadius: 11, height: 66, justifyContent: 'center', width: 78 },
  draftCopy: { flex: 1, minWidth: 0 },
  draftTitleRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  draftTitle: { color: '#102550', flex: 1, fontSize: 15, fontWeight: '900' },
  draftStatus: { backgroundColor: '#EAF4FF', borderRadius: 999, color: '#0B6FE8', fontSize: 10, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 7, paddingVertical: 3 },
  draftProgressText: { color: '#536B91', fontSize: 12, fontWeight: '700', marginTop: 5 },
  draftAction: { alignItems: 'center', alignSelf: 'stretch', backgroundColor: '#0B6FE8', borderRadius: 11, flexDirection: 'row', justifyContent: 'center', minHeight: 46, paddingHorizontal: 14 },
  draftActionText: { color: '#FFFFFF', flex: 1, fontSize: 14, fontWeight: '900', textAlign: 'center' },
  progressBadge: { alignItems: 'center', backgroundColor: '#EAF4FF', borderRadius: 999, justifyContent: 'center', minHeight: 30, minWidth: 38, paddingHorizontal: 8 },
  progressText: { color: '#075BC8', fontSize: 12, fontWeight: '900' },
  progressTrack: { backgroundColor: '#D6E8FF', borderRadius: 999, height: 6, overflow: 'hidden' },
  progressFill: { backgroundColor: '#0B6FE8', borderRadius: 999, height: 6 },
  checklist: { borderTopColor: '#D6E8FF', borderTopWidth: 1 },
  setupTask: { alignItems: 'center', borderBottomColor: '#EAF4FF', borderBottomWidth: 1, flexDirection: 'row', gap: 10, minHeight: 58, paddingVertical: 8 },
  setupTaskIcon: { alignItems: 'center', backgroundColor: '#EAF4FF', borderRadius: 10, height: 38, justifyContent: 'center', width: 38 },
  setupTaskIconComplete: { backgroundColor: '#E8F8EE' },
  setupTaskCopy: { flex: 1, minWidth: 0 },
  setupTaskTitle: { color: '#102550', fontSize: 14, fontWeight: '800' },
  setupTaskStatus: { color: '#536B91', fontSize: 12, fontWeight: '600', marginTop: 1 },
  setupTaskProgressTrack: { backgroundColor: '#D6E8FF', borderRadius: 999, height: 4, marginTop: 7, overflow: 'hidden' },
  setupTaskProgressFill: { backgroundColor: '#0B6FE8', borderRadius: 999, height: 4 },
  setupAction: { alignItems: 'center', backgroundColor: '#0B6FE8', borderRadius: 9, justifyContent: 'center', minHeight: 38, paddingHorizontal: 11 },
  setupActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  checklistToggle: { alignItems: 'center', flexDirection: 'row', gap: 3, minHeight: 36, paddingVertical: 2 },
  checklistToggleText: { color: '#0B6FE8', fontSize: 12, fontWeight: '900' },
  intro: { color: '#536B91', fontSize: 14, fontWeight: '600', lineHeight: 20 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 14, borderWidth: 1, gap: 6, minHeight: 128, padding: 13, width: '48.5%' },
  metricIcon: { alignItems: 'center', backgroundColor: '#F3F9FF', borderRadius: 10, height: 36, justifyContent: 'center', width: 36 },
  metricLabel: { color: '#536B91', fontSize: 12, fontWeight: '700', lineHeight: 16 },
  metricValue: { color: '#102550', fontSize: 25, fontWeight: '900' },
  earningsCard: { backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 16, borderWidth: 1, gap: 13, padding: 14 },
  textAction: { alignItems: 'center', flexDirection: 'row', minHeight: 32 },
  textActionLabel: { color: '#0B6FE8', fontSize: 12, fontWeight: '900' },
  earningsValues: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  earningsValue: { color: '#102550', fontSize: 22, fontWeight: '900' },
  earningsLabel: { color: '#536B91', fontSize: 12, fontWeight: '700', marginTop: 2 },
  earningsDivider: { backgroundColor: '#D6E8FF', height: 34, width: 1 },
  inlineError: { color: '#536B91', fontSize: 13, fontWeight: '700' },
  activityCard: { backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 16, borderWidth: 1, gap: 11, padding: 14 },
  activityList: { borderTopColor: '#EAF4FF', borderTopWidth: 1 },
  activityRow: { alignItems: 'center', borderBottomColor: '#EAF4FF', borderBottomWidth: 1, flexDirection: 'row', gap: 9, minHeight: 58, paddingVertical: 8 },
  activityIcon: { alignItems: 'center', backgroundColor: '#EAF4FF', borderRadius: 10, height: 36, justifyContent: 'center', width: 36 },
  activityCopy: { flex: 1, minWidth: 0 },
  activityTitle: { color: '#102550', fontSize: 13, fontWeight: '800' },
  activityDetail: { color: '#536B91', fontSize: 12, fontWeight: '600', marginTop: 2 },
  activityDate: { color: '#536B91', fontSize: 11, fontWeight: '700' },
  activityEmpty: { alignItems: 'center', backgroundColor: '#F8FBFF', borderRadius: 12, flexDirection: 'row', gap: 10, padding: 12 },
  activityEmptyTitle: { color: '#102550', fontSize: 13, fontWeight: '800' },
  activityEmptyBody: { color: '#536B91', flexShrink: 1, fontSize: 12, fontWeight: '600', lineHeight: 17, marginTop: 2 },
  pressed: { opacity: 0.78 },
  state: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center', padding: 28 },
  stateTitle: { color: '#102550', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  stateBody: { color: '#536B91', fontSize: 14, fontWeight: '600', lineHeight: 20, textAlign: 'center' },
  retryButton: { alignItems: 'center', backgroundColor: '#0B6FE8', borderRadius: 12, justifyContent: 'center', minHeight: 46, minWidth: 124, paddingHorizontal: 16 },
  retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});
