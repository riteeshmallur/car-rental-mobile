import { AppText as Text } from '@/components/typography/app-text';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeft, Banknote, CalendarDays } from 'lucide-react-native';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  RefreshControl,
  StyleSheet,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { formatMoney } from '@/features/customer/utils/car-formatters';
import { getPayoutStatusPresentation } from '@/features/host-earnings/utils/payout-status';
import { useSafeBack } from '@/hooks/use-safe-back';
import { hostsApi } from '@/services/hosts/hosts-api';
import { type HostPayoutRecord } from '@/types/car';
import { normalizeApiError } from '@/utils/errors';

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));
}

export function HostPayoutsScreen() {
  const goBack = useSafeBack({ fallback: '/(host)/profile' });
  const payoutsQuery = useQuery({
    queryKey: ['host', 'payouts'],
    queryFn: hostsApi.payouts,
  });
  const isRefreshing = payoutsQuery.isRefetching && !payoutsQuery.isLoading;

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
              <Text style={styles.title}>Payouts</Text>
            </View>
          </View>
        </View>

        {payoutsQuery.isLoading ? (
          <LoadingState />
        ) : payoutsQuery.isError ? (
          <StateMessage
            actionLabel="Try again"
            body={normalizeApiError(payoutsQuery.error).message}
            onAction={() => void payoutsQuery.refetch()}
            title="Payouts could not load"
          />
        ) : (
          <FlatList
            contentContainerStyle={styles.listContent}
            data={payoutsQuery.data ?? []}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={
              <StateMessage
                body="Completed, paid trips will appear here when the backend creates a payout."
                title="No payouts yet"
              />
            }
            ListHeaderComponent={
              <View style={styles.introCard}>
                <View style={styles.introIcon}>
                  <Banknote color="#047857" size={21} />
                </View>
                <View style={styles.introCopy}>
                  <Text style={styles.introTitle}>Payout history</Text>
                  <Text style={styles.introBody}>
                    Payouts are generated from completed, paid trips.
                  </Text>
                </View>
              </View>
            }
            refreshControl={
              <RefreshControl
                onRefresh={() => void payoutsQuery.refetch()}
                refreshing={isRefreshing}
              />
            }
            renderItem={({ item }) => <PayoutCard payout={item} />}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
    </SafeAreaView>
  );
}

function PayoutCard({ payout }: { payout: HostPayoutRecord }) {
  const status = getPayoutStatusPresentation(payout.status);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <View style={styles.dateRow}>
          <CalendarDays color="#536B91" size={17} />
          <Text style={styles.dateText}>{formatDate(payout.createdAt)}</Text>
        </View>
        <View style={[styles.status, getStatusStyle(status.tone)]}>
          <Text style={[styles.statusText, getStatusTextStyle(status.tone)]}>
            {status.label}
          </Text>
        </View>
      </View>
      <View style={styles.totalRow}>
        <Text style={styles.totalLabel}>Net payout</Text>
        <Text style={styles.totalValue}>{formatMoney(payout.netAmount)}</Text>
      </View>
      <View style={styles.line} />
      <PayoutDetail label="Trip earnings" value={formatMoney(payout.grossAmount)} />
      <PayoutDetail label="Platform commission" value={`-${formatMoney(payout.platformCommission)}`} />
      {Number(payout.taxWithheld) > 0 ? (
        <PayoutDetail label="Tax withheld" value={`-${formatMoney(payout.taxWithheld)}`} />
      ) : null}
      {Number(payout.refundAdjustmentAmount) !== 0 ? (
        <PayoutDetail label="Refund adjustment" value={formatMoney(payout.refundAdjustmentAmount)} />
      ) : null}
      {payout.processedAt ? (
        <Text style={styles.processed}>Processed {formatDate(payout.processedAt)}</Text>
      ) : null}
    </View>
  );
}

function getStatusStyle(tone: 'neutral' | 'positive' | 'warning' | 'danger') {
  if (tone === 'positive') return styles.statusPaid;
  if (tone === 'danger') return styles.statusFailed;
  if (tone === 'neutral') return styles.statusNeutral;
  return styles.statusPending;
}

function getStatusTextStyle(tone: 'neutral' | 'positive' | 'warning' | 'danger') {
  if (tone === 'positive') return styles.statusTextPaid;
  if (tone === 'danger') return styles.statusTextFailed;
  if (tone === 'neutral') return styles.statusTextNeutral;
  return styles.statusTextPending;
}

function PayoutDetail({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function LoadingState() {
  return (
    <View style={styles.state}>
      <ActivityIndicator color="#0B6FE8" />
      <Text style={styles.stateBody}>Loading payouts</Text>
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

const styles = StyleSheet.create({
  safeArea: { backgroundColor: '#F3F9FF', flex: 1 },
  screen: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', minHeight: 76, paddingHorizontal: 16 },
  headerLead: { alignItems: 'center', flexDirection: 'row', gap: 12 },
  iconButton: { alignItems: 'center', backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 12, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  eyebrow: { color: '#536B91', fontSize: 11, fontWeight: '800', textTransform: 'uppercase' },
  title: { color: '#102550', fontSize: 23, fontWeight: '800' },
  listContent: { gap: 12, padding: 16, paddingBottom: 32 },
  introCard: { alignItems: 'center', backgroundColor: '#ECFDF3', borderColor: '#BBF7D0', borderRadius: 14, borderWidth: 1, flexDirection: 'row', gap: 11, padding: 14 },
  introIcon: { alignItems: 'center', backgroundColor: '#FFFFFF', borderRadius: 10, height: 42, justifyContent: 'center', width: 42 },
  introCopy: { flex: 1 },
  introTitle: { color: '#14532D', fontSize: 16, fontWeight: '800' },
  introBody: { color: '#166534', fontSize: 12, fontWeight: '700', lineHeight: 18, marginTop: 2 },
  card: { backgroundColor: '#FFFFFF', borderColor: '#D6E8FF', borderRadius: 14, borderWidth: 1, gap: 10, padding: 14 },
  cardHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between' },
  dateRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  dateText: { color: '#536B91', fontSize: 13, fontWeight: '800' },
  status: { borderRadius: 999, paddingHorizontal: 9, paddingVertical: 5 },
  statusPaid: { backgroundColor: '#DCFCE7' },
  statusPending: { backgroundColor: '#FEF3C7' },
  statusFailed: { backgroundColor: '#FEE2E2' },
  statusNeutral: { backgroundColor: '#EAF4FF' },
  statusText: { fontSize: 11, fontWeight: '800', textTransform: 'capitalize' },
  statusTextPaid: { color: '#166534' },
  statusTextPending: { color: '#92400E' },
  statusTextFailed: { color: '#B91C1C' },
  statusTextNeutral: { color: '#075BC8' },
  totalRow: { alignItems: 'baseline', flexDirection: 'row', justifyContent: 'space-between' },
  totalLabel: { color: '#536B91', fontSize: 14, fontWeight: '800' },
  totalValue: { color: '#102550', fontSize: 21, fontWeight: '800' },
  line: { backgroundColor: '#D6E8FF', height: 1 },
  detailRow: { flexDirection: 'row', justifyContent: 'space-between' },
  detailLabel: { color: '#536B91', fontSize: 13, fontWeight: '600' },
  detailValue: { color: '#536B91', fontSize: 13, fontWeight: '800' },
  processed: { color: '#047857', fontSize: 12, fontWeight: '800' },
  state: { alignItems: 'center', flex: 1, gap: 10, justifyContent: 'center', padding: 28 },
  stateTitle: { color: '#102550', fontSize: 20, fontWeight: '800', textAlign: 'center' },
  stateBody: { color: '#536B91', fontSize: 14, fontWeight: '600', lineHeight: 20, textAlign: 'center' },
  retryButton: { alignItems: 'center', backgroundColor: '#0B6FE8', borderRadius: 12, justifyContent: 'center', minHeight: 46, minWidth: 124, paddingHorizontal: 16 },
  retryText: { color: '#FFFFFF', fontSize: 14, fontWeight: '800' },
});
