import { useQuery } from '@tanstack/react-query';
import {
  ArrowLeft,
  Banknote,
  CalendarDays,
  CarFront,
  CheckCircle2,
  Clock3,
  TrendingUp,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
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

import { CachedVehicleImage } from '@/features/customer/components/cached-vehicle-image';
import { HostBottomNavigation } from '@/features/host/components/host-bottom-navigation';
import {
  formatMoney,
  getVehicleImageVariantUrl,
} from '@/features/customer/utils/car-formatters';
import { hostsApi } from '@/services/hosts/hosts-api';
import { useSafeBack } from '@/hooks/use-safe-back';
import { type HostEarningEntry, type HostEarningsParams } from '@/types/car';
import { normalizeApiError } from '@/utils/errors';

type HistoryFilter = 'all' | 'month';

const filters: { label: string; value: HistoryFilter }[] = [
  { label: 'All history', value: 'all' },
  { label: 'This month', value: 'month' },
];

function getMonthStartIso() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', {
    dateStyle: 'medium',
  }).format(new Date(value));
}

function formatStatus(value: string) {
  return value.replace(/_/g, ' ');
}

export function HostEarningsScreen() {
  const [activeFilter, setActiveFilter] = useState<HistoryFilter>('all');
  const [page, setPage] = useState(1);
  const goBack = useSafeBack({ fallback: '/(host)/profile' });

  const queryParams = useMemo<HostEarningsParams>(
    () => ({
      limit: 20,
      page,
      ...(activeFilter === 'month' ? { startsAt: getMonthStartIso() } : {}),
    }),
    [activeFilter, page],
  );

  const earningsQuery = useQuery({
    queryKey: ['host', 'earnings', queryParams],
    queryFn: () => hostsApi.earnings(queryParams),
  });

  const earnings = earningsQuery.data;
  const isRefreshing = earningsQuery.isRefetching && !earningsQuery.isLoading;

  const changeFilter = (filter: HistoryFilter) => {
    setActiveFilter(filter);
    setPage(1);
  };

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
              <ArrowLeft color="#102550" size={20} />
            </Pressable>
            <View>
              <Text style={styles.eyebrow}>Host</Text>
              <Text style={styles.title}>Earnings</Text>
            </View>
          </View>
        </View>

        {earningsQuery.isLoading ? (
          <EarningsSkeleton />
        ) : earningsQuery.isError ? (
          <StateMessage
            actionLabel="Try again"
            body={normalizeApiError(earningsQuery.error).message}
            onAction={() => void earningsQuery.refetch()}
            title="Earnings could not load"
          />
        ) : earnings ? (
          <FlatList
            ListHeaderComponent={
              <View style={styles.headerContent}>
                <View style={styles.summaryGrid}>
                  <SummaryTile
                    icon={<TrendingUp color="#0F766E" size={20} />}
                    label="Total earnings"
                    value={formatMoney(earnings.totalEarnings)}
                  />
                  <SummaryTile
                    icon={<CalendarDays color="#075BC8" size={20} />}
                    label="This month"
                    value={formatMoney(earnings.thisMonthEarnings)}
                  />
                  <SummaryTile
                    icon={<Clock3 color="#B45309" size={20} />}
                    label="Pending payouts"
                    value={formatMoney(earnings.pendingPayouts)}
                  />
                  <SummaryTile
                    icon={<CheckCircle2 color="#047857" size={20} />}
                    label="Completed payouts"
                    value={formatMoney(earnings.completedPayouts)}
                  />
                </View>

                <View style={styles.historyHeader}>
                  <Text style={styles.sectionTitle}>Earnings history</Text>
                  <Text style={styles.historyCount}>{earnings.meta.total} entries</Text>
                </View>

                <View style={styles.filters}>
                  {filters.map((filter) => {
                    const isActive = filter.value === activeFilter;

                    return (
                      <Pressable
                        accessibilityRole="button"
                        key={filter.value}
                        onPress={() => changeFilter(filter.value)}
                        style={[styles.filterButton, isActive && styles.filterButtonActive]}
                      >
                        <Text
                          style={[
                            styles.filterText,
                            isActive && styles.filterTextActive,
                          ]}
                        >
                          {filter.label}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>
              </View>
            }
            ListEmptyComponent={
              <StateMessage
                body="No earnings match this history view."
                title="No earnings yet"
              />
            }
            ListFooterComponent={
              earnings.meta.totalPages > 1 ? (
                <View style={styles.paginationRow}>
                  <Pressable
                    accessibilityRole="button"
                    disabled={page <= 1}
                    onPress={() => setPage((current) => Math.max(1, current - 1))}
                    style={[styles.pageButton, page <= 1 && styles.disabledButton]}
                  >
                    <Text style={styles.pageButtonText}>Previous</Text>
                  </Pressable>
                  <Text style={styles.pageText}>
                    Page {earnings.meta.page} of {earnings.meta.totalPages}
                  </Text>
                  <Pressable
                    accessibilityRole="button"
                    disabled={!earnings.meta.hasNextPage}
                    onPress={() => setPage((current) => current + 1)}
                    style={[
                      styles.pageButton,
                      !earnings.meta.hasNextPage && styles.disabledButton,
                    ]}
                  >
                    <Text style={styles.pageButtonText}>Next</Text>
                  </Pressable>
                </View>
              ) : null
            }
            contentContainerStyle={styles.listContent}
            data={earnings.items}
            keyExtractor={(item) => item.id}
            style={styles.listView}
            refreshControl={
              <RefreshControl
                onRefresh={() => void earningsQuery.refetch()}
                refreshing={isRefreshing}
              />
            }
            renderItem={({ item }) => <EarningCard entry={item} />}
            showsVerticalScrollIndicator={false}
          />
        ) : null}
      </View>
      <HostBottomNavigation />
    </SafeAreaView>
  );
}

function SummaryTile({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.summaryTile}>
      <View style={styles.summaryIcon}>{icon}</View>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text adjustsFontSizeToFit numberOfLines={1} style={styles.summaryValue}>
        {value}
      </Text>
    </View>
  );
}

function EarningCard({ entry }: { entry: HostEarningEntry }) {
  const imageUrl = getVehicleImageVariantUrl(entry.vehicle.imageUrl, 'thumbnail');
  const vehicleName = `${entry.vehicle.make} ${entry.vehicle.model}`;

  return (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        {imageUrl ? (
          <CachedVehicleImage style={styles.vehicleImage} uri={imageUrl} />
        ) : (
          <View style={styles.imageFallback}>
            <CarFront color="#102550" size={28} />
          </View>
        )}
        <View style={styles.cardCopy}>
          <View style={styles.titleRow}>
            <Text numberOfLines={1} style={styles.vehicleName}>
              {vehicleName}
            </Text>
            <View style={[styles.statusBadge, getPayoutStatusStyle(entry.payoutStatus)]}>
              <Text style={styles.statusText}>{formatStatus(entry.payoutStatus)}</Text>
            </View>
          </View>
          <Text selectable style={styles.reference}>
            Ref {entry.bookingReference.slice(0, 8).toUpperCase()}
          </Text>
          <Text style={styles.dateText}>{formatDate(entry.paidAt)}</Text>
        </View>
      </View>

      <View style={styles.breakdown}>
        <MoneyRow label="Rental amount" value={entry.grossRentalAmount} />
        <MoneyRow label="Platform commission" value={entry.platformCommission} />
        <MoneyRow emphasized label="Host earnings" value={entry.hostNetAmount} />
      </View>
    </View>
  );
}

function MoneyRow({
  emphasized,
  label,
  value,
}: {
  emphasized?: boolean;
  label: string;
  value: string;
}) {
  return (
    <View style={styles.moneyRow}>
      <Text style={[styles.moneyLabel, emphasized && styles.moneyLabelStrong]}>
        {label}
      </Text>
      <Text style={[styles.moneyValue, emphasized && styles.moneyValueStrong]}>
        {formatMoney(value)}
      </Text>
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

function EarningsSkeleton() {
  return (
    <View style={styles.skeletonContent}>
      <View style={styles.summaryGrid}>
        {[0, 1, 2, 3].map((item) => (
          <View key={item} style={styles.skeletonTile} />
        ))}
      </View>
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

function getPayoutStatusStyle(status: HostEarningEntry['payoutStatus']) {
  if (status === 'completed') {
    return styles.statusGreen;
  }

  if (status === 'pending') {
    return styles.statusYellow;
  }

  return styles.statusRed;
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F9FF',
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
    color: '#102550',
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
    borderColor: '#D6E8FF',
    backgroundColor: '#FFFFFF',
  },
  listContent: {
    padding: 16,
    paddingBottom: 30,
  },
  listView: {
    flex: 1,
    minHeight: 0,
  },
  headerContent: {
    gap: 18,
    marginBottom: 14,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  summaryTile: {
    minHeight: 116,
    flexBasis: '48%',
    flexGrow: 1,
    gap: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    backgroundColor: '#FFFFFF',
    padding: 13,
  },
  summaryIcon: {
    height: 34,
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#F3F9FF',
  },
  summaryLabel: {
    color: '#536B91',
    fontSize: 12,
    fontWeight: '900',
  },
  summaryValue: {
    color: '#102550',
    fontSize: 22,
    fontWeight: '900',
  },
  historyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    color: '#102550',
    fontSize: 18,
    fontWeight: '900',
  },
  historyCount: {
    color: '#536B91',
    fontSize: 12,
    fontWeight: '900',
  },
  filters: {
    flexDirection: 'row',
    gap: 8,
  },
  filterButton: {
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 14,
  },
  filterButtonActive: {
    borderColor: '#0F766E',
    backgroundColor: '#CCFBF1',
  },
  filterText: {
    color: '#536B91',
    fontSize: 13,
    fontWeight: '900',
  },
  filterTextActive: {
    color: '#0F766E',
  },
  card: {
    gap: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    backgroundColor: '#FFFFFF',
    padding: 12,
    marginBottom: 12,
  },
  cardTop: {
    flexDirection: 'row',
    gap: 12,
  },
  vehicleImage: {
    height: 82,
    width: 94,
    borderRadius: 8,
    backgroundColor: '#D6E8FF',
  },
  imageFallback: {
    height: 82,
    width: 94,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#EAF4FF',
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
    color: '#102550',
    fontSize: 16,
    fontWeight: '900',
  },
  statusBadge: {
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  statusText: {
    color: '#102550',
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
  statusRed: {
    backgroundColor: '#FEE2E2',
  },
  reference: {
    color: '#536B91',
    fontSize: 12,
    fontWeight: '800',
  },
  dateText: {
    color: '#536B91',
    fontSize: 12,
    fontWeight: '900',
  },
  breakdown: {
    gap: 9,
    borderRadius: 8,
    backgroundColor: '#F3F9FF',
    padding: 12,
  },
  moneyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 14,
  },
  moneyLabel: {
    color: '#536B91',
    fontSize: 13,
    fontWeight: '800',
  },
  moneyLabelStrong: {
    color: '#102550',
    fontWeight: '900',
  },
  moneyValue: {
    color: '#536B91',
    fontSize: 13,
    fontWeight: '900',
  },
  moneyValueStrong: {
    color: '#102550',
    fontSize: 16,
  },
  paginationRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
  },
  pageButton: {
    minHeight: 48,
    minWidth: 104,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    backgroundColor: '#FFFFFF',
  },
  pageButtonText: {
    color: '#102550',
    fontSize: 14,
    fontWeight: '900',
  },
  pageText: {
    color: '#536B91',
    fontSize: 13,
    fontWeight: '900',
  },
  disabledButton: {
    opacity: 0.45,
  },
  stateBox: {
    marginTop: 16,
    gap: 8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    backgroundColor: '#FFFFFF',
    padding: 18,
  },
  stateTitle: {
    color: '#102550',
    fontSize: 18,
    fontWeight: '900',
  },
  stateBody: {
    color: '#536B91',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  stateButton: {
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0B6FE8',
    paddingHorizontal: 16,
  },
  stateButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '900',
  },
  skeletonContent: {
    gap: 12,
    padding: 16,
  },
  skeletonTile: {
    minHeight: 116,
    flexBasis: '48%',
    flexGrow: 1,
    borderRadius: 8,
    backgroundColor: '#D6E8FF',
  },
  skeletonCard: {
    minHeight: 106,
    flexDirection: 'row',
    gap: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  skeletonImage: {
    height: 82,
    width: 94,
    borderRadius: 8,
    backgroundColor: '#D6E8FF',
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
    backgroundColor: '#D6E8FF',
  },
  skeletonLine: {
    height: 13,
    width: '58%',
    borderRadius: 8,
    backgroundColor: '#D6E8FF',
  },
  skeletonLineShort: {
    height: 13,
    width: '38%',
    borderRadius: 8,
    backgroundColor: '#D6E8FF',
  },
});
