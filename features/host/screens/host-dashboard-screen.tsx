import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Banknote,
  CalendarCheck2,
  CarFront,
  Clock3,
  FileSearch,
  RefreshCw,
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
import { hostsApi } from '@/services/hosts/hosts-api';
import { normalizeApiError } from '@/utils/errors';

export function HostDashboardScreen() {
  const goBack = useSafeBack({ fallback: '/(host)/profile' });
  const dashboardQuery = useQuery({
    queryKey: ['host', 'dashboard'],
    queryFn: hostsApi.dashboard,
  });
  const isRefreshing = dashboardQuery.isRefetching && !dashboardQuery.isLoading;

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
              <ArrowLeft color="#0F172A" size={21} />
            </Pressable>
            <View>
              <Text style={styles.eyebrow}>Host</Text>
              <Text style={styles.title}>Dashboard</Text>
            </View>
          </View>
          {dashboardQuery.isFetching ? (
            <ActivityIndicator color="#0B4FE8" />
          ) : (
            <Pressable
              accessibilityLabel="Refresh dashboard"
              accessibilityRole="button"
              onPress={() => void dashboardQuery.refetch()}
              style={styles.iconButton}
            >
              <RefreshCw color="#0F172A" size={20} />
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
                onRefresh={() => void dashboardQuery.refetch()}
                refreshing={isRefreshing}
              />
            }
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.intro}>A live view of your listing and booking activity.</Text>
            <View style={styles.metrics}>
              <MetricCard
                icon={<CarFront color="#0B4FE8" size={20} />}
                label="Active listings"
                value={String(dashboardQuery.data.activeListings)}
              />
              <MetricCard
                icon={<FileSearch color="#B45309" size={20} />}
                label="In review"
                value={String(dashboardQuery.data.pendingListingReviews)}
              />
              <MetricCard
                icon={<CalendarCheck2 color="#047857" size={20} />}
                label="Booking requests"
                value={String(dashboardQuery.data.bookingRequests)}
              />
              <MetricCard
                icon={<Clock3 color="#7C3AED" size={20} />}
                label="Active trips"
                value={String(dashboardQuery.data.activeTrips)}
              />
            </View>
            <View style={styles.payoutCard}>
              <View style={styles.payoutIcon}>
                <Banknote color="#047857" size={22} />
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
              icon={<CarFront color="#0B4FE8" size={20} />}
              onPress={() => router.push('/(host)/cars')}
              title="My Cars"
            />
            <ActionRow
              body="Review pending requests and current trips."
              icon={<CalendarCheck2 color="#0B4FE8" size={20} />}
              onPress={() => router.push('/(host)/bookings')}
              title="Bookings"
            />
            <ActionRow
              body="Review completed earnings by booking."
              icon={<Banknote color="#0B4FE8" size={20} />}
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
      <ActivityIndicator color="#0B4FE8" />
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
  safeArea: { backgroundColor: '#F7FAFF', flex: 1 },
  screen: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 76, paddingHorizontal: 16 },
  headerLead: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  iconButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 12, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  eyebrow: { color: '#64748B', fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: '#0F172A', fontSize: 23, fontWeight: '900' },
  content: { gap: 12, padding: 16, paddingBottom: 32 },
  intro: { color: '#64748B', fontSize: 14, fontWeight: '600', lineHeight: 20 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
  metricCard: { backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 14, borderWidth: 1, gap: 6, minHeight: 128, padding: 13, width: '48.5%' },
  metricIcon: { alignItems: 'center', backgroundColor: '#F8FAFC', borderRadius: 10, height: 36, justifyContent: 'center', width: 36 },
  metricLabel: { color: '#64748B', fontSize: 12, fontWeight: '700', lineHeight: 16 },
  metricValue: { color: '#0F172A', fontSize: 25, fontWeight: '900' },
  payoutCard: { alignItems: 'center', backgroundColor: '#ECFDF3', borderColor: '#BBF7D0', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 11, padding: 14 },
  payoutIcon: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 11, height: 42, justifyContent: 'center', width: 42 },
  payoutCopy: { flex: 1 },
  payoutLabel: { color: '#166534', fontSize: 12, fontWeight: '800' },
  payoutValue: { color: '#14532D', fontSize: 20, fontWeight: '900', marginTop: 2 },
  payoutAction: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#BBF7D0', borderRadius: 10, borderWidth: 1, justifyContent: 'center', minHeight: 40, paddingHorizontal: 12 },
  payoutActionText: { color: '#047857', fontSize: 13, fontWeight: '900' },
  sectionTitle: { color: '#0F172A', fontSize: 17, fontWeight: '900', marginTop: 4 },
  actionRow: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#E2E8F0', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 11, minHeight: 76, padding: 13 },
  actionIcon: { alignItems: 'center', backgroundColor: '#EFF6FF', borderRadius: 10, height: 40, justifyContent: 'center', width: 40 },
  actionCopy: { flex: 1, minWidth: 0 },
  actionTitle: { color: '#0F172A', fontSize: 15, fontWeight: '900' },
  actionBody: { color: '#64748B', fontSize: 12, fontWeight: '600', lineHeight: 17, marginTop: 2 },
  chevron: { color: '#64748B', fontSize: 28, lineHeight: 28 },
  pressed: { opacity: 0.78 },
  state: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center', padding: 28 },
  stateTitle: { color: '#0F172A', fontSize: 20, fontWeight: '900', textAlign: 'center' },
  stateBody: { color: '#64748B', fontSize: 14, fontWeight: '600', lineHeight: 20, textAlign: 'center' },
  retryButton: { alignItems: 'center', backgroundColor: '#0B4FE8', borderRadius: 12, justifyContent: 'center', minHeight: 46, minWidth: 124, paddingHorizontal: 16 },
  retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '900' },
});
