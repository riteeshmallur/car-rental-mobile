import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Banknote,
  CalendarCheck2,
  CarFront,
  CheckCircle2,
  Clock3,
  FileSearch,
  Landmark,
  RefreshCw,
  ShieldCheck,
} from 'lucide-react-native';
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

import { formatMoney } from '@/features/customer/utils/car-formatters';
import { HostBottomNavigation } from '@/features/host/components/host-bottom-navigation';
import { useSafeBack } from '@/hooks/use-safe-back';
import { hostsApi, type HostSetupStatus, type HostSetupTaskKey } from '@/services/hosts/hosts-api';
import { normalizeApiError } from '@/utils/errors';

export function HostDashboardScreen() {
  const goBack = useSafeBack({ fallback: '/(host)/profile' });
  const dashboardQuery = useQuery({
    queryKey: ['host', 'dashboard'],
    queryFn: hostsApi.dashboard,
  });
  const setupQuery = useQuery({
    queryKey: ['host', 'setup-status'],
    queryFn: hostsApi.setupStatus,
  });
  const isRefreshing =
    (dashboardQuery.isRefetching && !dashboardQuery.isLoading) ||
    (setupQuery.isRefetching && !setupQuery.isLoading);
  const refreshDashboard = () => {
    void dashboardQuery.refetch();
    void setupQuery.refetch();
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <View style={styles.headerLead}>
            <Pressable
              accessibilityLabel="Go back"
              accessibilityRole="button"
              onPress={goBack}
              style={styles.iconButton}
            >
              <ArrowLeft color="#102550" size={21} />
            </Pressable>
            <View>
              <Text style={styles.eyebrow}>Host</Text>
              <Text style={styles.title}>Dashboard</Text>
            </View>
          </View>
          {dashboardQuery.isFetching || setupQuery.isFetching ? (
            <ActivityIndicator color="#0B6FE8" />
          ) : (
            <Pressable
              accessibilityLabel="Refresh dashboard"
              accessibilityRole="button"
              onPress={refreshDashboard}
              style={styles.iconButton}
            >
              <RefreshCw color="#102550" size={20} />
            </Pressable>
          )}
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
            {setupQuery.data?.status !== 'complete' ? (
              <HostSetupChecklist setup={setupQuery.data} isLoading={setupQuery.isLoading} onRetry={() => void setupQuery.refetch()} />
            ) : null}
            <Text style={styles.intro}>A live view of your listing and booking activity.</Text>
            <View style={styles.metrics}>
              <MetricCard
                icon={<CarFront color="#0B6FE8" size={20} />}
                label="Active listings"
                value={String(dashboardQuery.data.activeListings)}
              />
              <MetricCard
                icon={<FileSearch color="#FF644F" size={20} />}
                label="In review"
                value={String(dashboardQuery.data.pendingListingReviews)}
              />
              <MetricCard
                icon={<CalendarCheck2 color="#0B6FE8" size={20} />}
                label="Booking requests"
                value={String(dashboardQuery.data.bookingRequests)}
              />
              <MetricCard
                icon={<Clock3 color="#536B91" size={20} />}
                label="Active trips"
                value={String(dashboardQuery.data.activeTrips)}
              />
            </View>
            <View style={styles.payoutCard}>
              <View style={styles.payoutIcon}>
                <Banknote color="#0B6FE8" size={22} />
              </View>
              <View style={styles.payoutCopy}>
                <Text style={styles.payoutLabel}>Pending payout</Text>
                <Text style={styles.payoutValue}>
                  {formatMoney(dashboardQuery.data.pendingPayoutAmount)}
                </Text>
              </View>
              <Pressable
                accessibilityRole="button"
                onPress={() => router.push('/(host)/payouts' as never)}
                style={styles.payoutAction}
              >
                <Text style={styles.payoutActionText}>View</Text>
              </Pressable>
            </View>
            <Text style={styles.sectionTitle}>Manage host activity</Text>
            <ActionRow
              body="Publish, pause, and manage availability."
              icon={<CarFront color="#0B6FE8" size={20} />}
              onPress={() => router.push('/(host)/cars')}
              title="My Cars"
            />
            <ActionRow
              body="Review pending requests and current trips."
              icon={<CalendarCheck2 color="#0B6FE8" size={20} />}
              onPress={() => router.push('/(host)/bookings')}
              title="Bookings"
            />
            <ActionRow
              body="Review completed earnings by booking."
              icon={<Banknote color="#0B6FE8" size={20} />}
              onPress={() => router.push('/(host)/earnings')}
              title="Earnings"
            />
          </ScrollView>
        ) : null}
      </View>
      <HostBottomNavigation />
    </SafeAreaView>
  );
}

function HostSetupChecklist({
  isLoading,
  onRetry,
  setup,
}: {
  isLoading: boolean;
  onRetry: () => void;
  setup: HostSetupStatus | undefined;
}) {
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
      <Text style={styles.setupBody}>Add your car, then complete identity and payout reviews before your listings can be activated and earnings processed.</Text>
      <View style={styles.progressTrack}>
        <View style={[styles.progressFill, { width: `${Math.max(8, (setup.completedTasks / setup.totalTasks) * 100)}%` }]} />
      </View>
      <View style={styles.checklist}>
        {setup.tasks.map((task) => <SetupTask key={task.key} status={task.status} taskKey={task.key} />)}
      </View>
    </View>
  );
}

function SetupTask({ status, taskKey }: { status: HostSetupStatus['tasks'][number]['status']; taskKey: HostSetupTaskKey }) {
  const definition = setupTaskDefinition(taskKey, status);
  const Icon = definition.icon;
  const complete = status === 'completed';
  const pendingReview = status === 'under_review';

  return (
    <View style={styles.setupTask}>
      <View style={[styles.setupTaskIcon, complete && styles.setupTaskIconComplete]}>
        {complete ? <CheckCircle2 color="#179447" size={21} /> : <Icon color="#0B6FE8" size={20} />}
      </View>
      <View style={styles.setupTaskCopy}>
        <Text style={styles.setupTaskTitle}>{definition.title}</Text>
        <Text style={styles.setupTaskStatus}>{complete ? 'Completed' : pendingReview ? 'Under review' : status === 'action_required' ? 'Action required' : 'Pending'}</Text>
      </View>
      {definition.action && !complete && !pendingReview ? (
        <Pressable accessibilityLabel={`${definition.action} ${definition.title}`} accessibilityRole="button" onPress={definition.onPress} style={styles.setupAction}>
          <Text style={styles.setupActionText}>{definition.action}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

function setupTaskDefinition(key: HostSetupTaskKey, status: HostSetupStatus['tasks'][number]['status']) {
  if (key === 'host_profile') return { icon: CheckCircle2, title: 'Create Host Profile' };
  if (key === 'first_car') {
    return {
      icon: CarFront,
      title: 'Add Your First Car',
      action: status === 'under_review' ? undefined : 'Add Car',
      onPress: () => router.push('/(host)/vehicles/new'),
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

function MetricCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <View style={styles.metricCard}>
      <View style={styles.metricIcon}>{icon}</View>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.metricValue}>
        {value}
      </Text>
    </View>
  );
}

function ActionRow({
  body,
  icon,
  onPress,
  title,
}: {
  body: string;
  icon: React.ReactNode;
  onPress: () => void;
  title: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.actionRow, pressed && styles.pressed]}
    >
      <View style={styles.actionIcon}>{icon}</View>
      <View style={styles.actionCopy}>
        <Text style={styles.actionTitle}>{title}</Text>
        <Text style={styles.actionBody}>{body}</Text>
      </View>
      <Text style={styles.chevron}>›</Text>
    </Pressable>
  );
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
  headerLead: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  iconButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 12, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  eyebrow: { color: '#536B91', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#102550', fontSize: 23, fontWeight: '900' },
  content: { gap: 12, padding: 16, paddingBottom: 32 },
  setupCard: { backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 16, borderWidth: 1, gap: 12, padding: 14 },
  setupHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  setupEyebrow: { color: '#0B6FE8', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  setupTitle: { color: '#102550', fontSize: 18, fontWeight: '900', marginTop: 2 },
  setupBody: { color: '#536B91', fontSize: 12, fontWeight: '600', lineHeight: 18 },
  setupLoadingText: { color: '#536B91', fontSize: 13, fontWeight: '700', textAlign: 'center' },
  setupRetryButton: { alignSelf: 'flex-start', backgroundColor: '#EAF4FF', borderRadius: 9, minHeight: 38, justifyContent: 'center', paddingHorizontal: 12 },
  setupRetryText: { color: '#0B6FE8', fontSize: 13, fontWeight: '900' },
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
  setupAction: { alignItems: 'center', backgroundColor: '#0B6FE8', borderRadius: 9, justifyContent: 'center', minHeight: 38, paddingHorizontal: 11 },
  setupActionText: { color: '#FFFFFF', fontSize: 12, fontWeight: '900' },
  intro: { color: '#536B91', fontSize: 14, fontWeight: '600', lineHeight: 20 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 14, borderWidth: 1, gap: 6, minHeight: 128, padding: 13, width: '48.5%' },
  metricIcon: { alignItems: 'center', backgroundColor: '#F3F9FF', borderRadius: 10, height: 36, justifyContent: 'center', width: 36 },
  metricLabel: { color: '#536B91', fontSize: 12, fontWeight: '700', lineHeight: 16 },
  metricValue: { color: '#102550', fontSize: 25, fontWeight: '900' },
  payoutCard: { alignItems: 'center', backgroundColor: '#EAF4FF', borderColor: '#D6E8FF', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 11, padding: 14 },
  payoutIcon: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 11, height: 42, justifyContent: 'center', width: 42 },
  payoutCopy: { flex: 1 },
  payoutLabel: { color: '#536B91', fontSize: 12, fontWeight: '800' },
  payoutValue: { color: '#102550', fontSize: 20, fontWeight: '900', marginTop: 2 },
  payoutAction: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 10, borderWidth: 1, justifyContent: 'center', minHeight: 40, paddingHorizontal: 12 },
  payoutActionText: { color: '#0B6FE8', fontSize: 13, fontWeight: '900' },
  sectionTitle: { color: '#102550', fontSize: 17, fontWeight: '900', marginTop: 4 },
  actionRow: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 11, minHeight: 76, padding: 13 },
  actionIcon: { alignItems: 'center', backgroundColor: '#EAF4FF', borderRadius: 10, height: 40, justifyContent: 'center', width: 40 },
  actionCopy: { flex: 1, minWidth: 0 },
  actionTitle: { color: '#102550', fontSize: 15, fontWeight: '900' },
  actionBody: { color: '#536B91', fontSize: 12, fontWeight: '600', lineHeight: 17, marginTop: 2 },
  chevron: { color: '#536B91', fontSize: 28, lineHeight: 28 },
  pressed: { opacity: 0.78 },
  state: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center', padding: 28 },
  stateTitle: { color: '#102550', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  stateBody: { color: '#536B91', fontSize: 14, fontWeight: '600', lineHeight: 20, textAlign: 'center' },
  retryButton: { alignItems: 'center', backgroundColor: '#0B6FE8', borderRadius: 12, justifyContent: 'center', minHeight: 46, minWidth: 124, paddingHorizontal: 16 },
  retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});
