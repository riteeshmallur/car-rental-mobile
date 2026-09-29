import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { router } from 'expo-router';
import {
  ArrowLeft,
  CarFront,
  Check,
  Eye,
  Pencil,
  Plus,
  Power,
  RefreshCw,
  SlidersHorizontal,
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
import { vehiclesApi } from '@/services/vehicles/vehicles-api';
import { useSafeBack } from '@/hooks/use-safe-back';
import {
  type HostVehicleListing,
  type HostVehicleListingStatus,
} from '@/types/car';
import { normalizeApiError } from '@/utils/errors';

type MyCarsTab = 'all' | 'published' | 'draft' | 'pending' | 'paused';

const tabs: { label: string; value: MyCarsTab }[] = [
  { label: 'All', value: 'all' },
  { label: 'Published', value: 'published' },
  { label: 'Draft', value: 'draft' },
  { label: 'Pending', value: 'pending' },
  { label: 'Paused', value: 'paused' },
];

const statusLabels: Record<HostVehicleListingStatus, string> = {
  DRAFT: 'Draft',
  PENDING_REVIEW: 'Pending',
  CHANGES_REQUIRED: 'Changes required',
  PUBLISHED: 'Published',
  PAUSED: 'Paused',
  REJECTED: 'Rejected',
  ARCHIVED: 'Archived',
};

export function HostMyCarsScreen() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState<MyCarsTab>('all');
  const goBack = useSafeBack({ fallback: '/(host)/profile' });

  const vehiclesQuery = useQuery({
    queryKey: ['host', 'vehicles'],
    queryFn: hostsApi.listVehicles,
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, operation }: { id: string; operation: 'pause' | 'resume' }) =>
      operation === 'pause' ? vehiclesApi.pause(id) : vehiclesApi.resume(id),
    onSuccess: (_, variables) => {
      void queryClient.invalidateQueries({ queryKey: ['host', 'vehicles'] });
      void queryClient.invalidateQueries({ queryKey: ['host', 'dashboard'] });
      Alert.alert(
        variables.operation === 'pause' ? 'Listing paused' : 'Listing resumed',
        variables.operation === 'pause'
          ? 'Customers can no longer book this vehicle.'
          : 'Customers can book this vehicle again.',
      );
    },
    onError: (error) => Alert.alert('Listing update failed', normalizeApiError(error).message),
  });
  const submitMutation = useMutation({
    mutationFn: vehiclesApi.submit,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['host', 'vehicles'] });
      void queryClient.invalidateQueries({ queryKey: ['host', 'dashboard'] });
      Alert.alert('Listing submitted', 'Your listing is now awaiting review.');
    },
    onError: (error) => Alert.alert('Listing update failed', normalizeApiError(error).message),
  });

  const carsByTab = useMemo(() => {
    const source = vehiclesQuery.data ?? [];

    return source.reduce<Record<MyCarsTab, HostVehicleListing[]>>(
      (acc, vehicle) => {
        acc.all.push(vehicle);

        if (vehicle.status === 'PUBLISHED') {
          acc.published.push(vehicle);
        } else if (vehicle.status === 'DRAFT' || vehicle.status === 'CHANGES_REQUIRED') {
          acc.draft.push(vehicle);
        } else if (vehicle.status === 'PENDING_REVIEW') {
          acc.pending.push(vehicle);
        } else if (vehicle.status === 'PAUSED') {
          acc.paused.push(vehicle);
        }

        return acc;
      },
      { all: [], published: [], draft: [], pending: [], paused: [] },
    );
  }, [vehiclesQuery.data]);

  const visibleCars = carsByTab[activeTab];
  const isRefreshing = vehiclesQuery.isRefetching && !vehiclesQuery.isLoading;

  const pauseVehicle = (vehicle: HostVehicleListing) => {
    Alert.alert(
      'Pause listing',
      `Pause ${getVehicleName(vehicle)}? Customers will not be able to book it.`,
      [
        { text: 'Keep active', style: 'cancel' },
        {
          text: 'Pause',
          style: 'destructive',
          onPress: () => statusMutation.mutate({ id: vehicle.id, operation: 'pause' }),
        },
      ],
    );
  };

  const resumeVehicle = (vehicle: HostVehicleListing) => {
    statusMutation.mutate({ id: vehicle.id, operation: 'resume' });
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
              <ArrowLeft color="#111827" size={20} />
            </Pressable>
            <View>
              <Text style={styles.eyebrow}>Host</Text>
              <Text style={styles.title}>My Cars</Text>
            </View>
          </View>
          {vehiclesQuery.isFetching ? (
            <ActivityIndicator color="#111827" />
          ) : (
            <Pressable
              accessibilityLabel="Refresh cars"
              accessibilityRole="button"
              onPress={() => void vehiclesQuery.refetch()}
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
                  {carsByTab[tab.value].length}
                </Text>
              </Pressable>
            );
          })}
        </View>

        {vehiclesQuery.isLoading ? (
          <ListSkeleton />
        ) : vehiclesQuery.isError ? (
          <StateMessage
            actionLabel="Try again"
            body={normalizeApiError(vehiclesQuery.error).message}
            onAction={() => void vehiclesQuery.refetch()}
            title="Cars could not load"
          />
        ) : (
          <FlatList
            ListEmptyComponent={
              <StateMessage
                body="No cars match this tab."
                title="No cars here"
              />
            }
            contentContainerStyle={styles.listContent}
            data={visibleCars}
            keyExtractor={(item) => item.id}
            style={styles.listView}
            refreshControl={
              <RefreshControl
                onRefresh={() => void vehiclesQuery.refetch()}
                refreshing={isRefreshing}
              />
            }
            renderItem={({ item }) => (
              <HostCarCard
                isUpdating={statusMutation.isPending && statusMutation.variables?.id === item.id}
                isSubmitting={submitMutation.isPending && submitMutation.variables === item.id}
                onEdit={() =>
                  router.push({
                    pathname: '/(host)/vehicles/new',
                    params: { vehicleId: item.id },
                  })
                }
                onManageAvailability={() =>
                  router.push(`/(host)/vehicles/${item.id}/availability` as never)
                }
                onPause={() => pauseVehicle(item)}
                onResume={() => resumeVehicle(item)}
                onSubmit={() => submitMutation.mutate(item.id)}
                onView={() =>
                  router.push({
                    pathname: '/(customer)/vehicles/[id]',
                    params: { id: item.id, origin: 'host-cars' },
                  })
                }
                vehicle={item}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        )}

        <Pressable
          accessibilityLabel="Add car"
          accessibilityRole="button"
          onPress={() => router.push('/(host)/vehicles/new')}
          style={styles.fab}
        >
          <Plus color="#FFFFFF" size={22} />
          <Text style={styles.fabText}>Add Car</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

function HostCarCard({
  isUpdating,
  isSubmitting,
  onEdit,
  onManageAvailability,
  onPause,
  onResume,
  onSubmit,
  onView,
  vehicle,
}: {
  isUpdating: boolean;
  isSubmitting: boolean;
  onEdit: () => void;
  onManageAvailability: () => void;
  onPause: () => void;
  onResume: () => void;
  onSubmit: () => void;
  onView: () => void;
  vehicle: HostVehicleListing;
}) {
  const imageUrl = getCarImageUrl(vehicle.imageUrls[0]);
  const canPause = vehicle.status === 'PUBLISHED';
  const canResume = vehicle.status === 'PAUSED';
  const canSubmit = vehicle.status === 'DRAFT' || vehicle.status === 'CHANGES_REQUIRED';
  const availability = getAvailabilityLabel(vehicle);

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
              {getVehicleName(vehicle)}
            </Text>
            <View style={[styles.statusBadge, getStatusStyle(vehicle.status)]}>
              <Text style={styles.statusText}>{statusLabels[vehicle.status]}</Text>
            </View>
          </View>
          <Text style={styles.price}>
            {vehicle.pricePerDay ? `${formatMoney(vehicle.pricePerDay)}/day` : 'Price not set'}
          </Text>
          <Text style={styles.availability}>{availability}</Text>
        </View>
      </View>

      <View style={styles.actionGrid}>
        <ActionButton icon={<Pencil color="#111827" size={16} />} label="Edit" onPress={onEdit} />
        {vehicle.status === 'PUBLISHED' ? (
          <ActionButton icon={<Eye color="#111827" size={16} />} label="View" onPress={onView} />
        ) : null}
        {canResume ? (
          <ActionButton
            disabled={isUpdating}
            icon={<Power color="#047857" size={16} />}
            label={isUpdating ? 'Resuming' : 'Resume'}
            onPress={onResume}
          />
        ) : (
          <ActionButton
            disabled={!canPause || isUpdating}
            icon={<Power color={canPause ? '#B91C1C' : '#9CA3AF'} size={16} />}
            label={isUpdating ? 'Pausing' : 'Pause'}
            onPress={onPause}
          />
        )}
        <ActionButton
          icon={<SlidersHorizontal color="#111827" size={16} />}
          label="Availability"
          onPress={onManageAvailability}
        />
        {canSubmit ? (
          <ActionButton
            disabled={isSubmitting}
            icon={<Check color="#047857" size={16} />}
            label={isSubmitting ? 'Submitting' : 'Submit listing'}
            onPress={onSubmit}
          />
        ) : null}
      </View>
    </View>
  );
}

function ActionButton({
  disabled,
  icon,
  label,
  onPress,
}: {
  disabled?: boolean;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        pressed && styles.pressed,
        disabled && styles.disabled,
      ]}
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

function ListSkeleton() {
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

function getVehicleName(vehicle: HostVehicleListing) {
  return [vehicle.make, vehicle.model].filter(Boolean).join(' ') || 'Untitled vehicle';
}

function getAvailabilityLabel(vehicle: HostVehicleListing) {
  if (vehicle.status === 'PUBLISHED' && vehicle.available) {
    return 'Available for bookings';
  }

  if (vehicle.status === 'PAUSED' || !vehicle.available) {
    return 'Not accepting bookings';
  }

  return 'Availability pending approval';
}

function getStatusStyle(status: HostVehicleListingStatus) {
  if (status === 'PUBLISHED') {
    return styles.statusGreen;
  }

  if (status === 'DRAFT' || status === 'CHANGES_REQUIRED') {
    return styles.statusYellow;
  }

  if (status === 'PAUSED') {
    return styles.statusGray;
  }

  if (status === 'REJECTED' || status === 'ARCHIVED') {
    return styles.statusRed;
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
    paddingHorizontal: 4,
  },
  activeTab: {
    borderColor: '#0F766E',
    backgroundColor: '#CCFBF1',
  },
  tabText: {
    color: '#4B5563',
    fontSize: 11,
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
    paddingBottom: 102,
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
    height: 94,
    width: 104,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  imageFallback: {
    height: 94,
    width: 104,
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
  price: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  metaText: {
    flex: 1,
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800',
  },
  availability: {
    color: '#374151',
    fontSize: 12,
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
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 22,
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 999,
    backgroundColor: '#0B4FE8',
    paddingHorizontal: 18,
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
  skeletonCard: {
    minHeight: 120,
    flexDirection: 'row',
    gap: 12,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  skeletonImage: {
    height: 94,
    width: 104,
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
  disabled: {
    opacity: 0.45,
  },
});
