import { useInfiniteQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  ArrowDownUp,
  Armchair,
  CarFront,
  ChevronDown,
  CircleDollarSign,
  Fuel,
  Heart,
  MapPin,
  SlidersHorizontal,
  Star,
  Settings2,
  Users,
  type LucideIcon,
} from 'lucide-react-native';
import { useCallback, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/features/customer/components/bottom-navigation';
import { useSafeBack } from '@/hooks/use-safe-back';
import { useWebBackGuard } from '@/hooks/use-web-back-guard';
import {
  formatDailyPrice,
  formatMoney,
  getCarImageUrl,
} from '@/features/customer/utils/car-formatters';
import { carsApi } from '@/services/cars/cars-api';
import {
  type VehicleSearchParams,
  type VehicleSearchResult,
  type VehicleSearchSort,
} from '@/types/car';
import { colors, radii, shadows } from '@/utils/theme';

const pageSize = 10;

const sortOptions: Array<{ label: string; value: VehicleSearchSort }> = [
  { label: 'Recommended', value: 'recommended' },
  { label: 'Price low to high', value: 'price_low_to_high' },
  { label: 'Price high to low', value: 'price_high_to_low' },
  { label: 'Rating', value: 'rating' },
];

const priceOptions = [
  { label: 'Any price' },
  { label: 'Under ₹2.5k', maxPrice: 2500 },
  { label: '₹2.5k - ₹5k', minPrice: 2500, maxPrice: 5000 },
  { label: '₹5k+', minPrice: 5000 },
] satisfies Array<{ label: string; minPrice?: number; maxPrice?: number }>;

const typeOptions = [
  { label: 'All types' },
  { label: 'Hatchback', value: 'hatchback' },
  { label: 'Sedan', value: 'sedan' },
  { label: 'SUV', value: 'suv' },
  { label: 'MUV', value: 'muv' },
] satisfies Array<{ label: string; value?: string }>;

const transmissionOptions = [
  { label: 'Any transmission' },
  { label: 'Manual', value: 'manual' },
  { label: 'Automatic', value: 'automatic' },
] satisfies Array<{ label: string; value?: string }>;

const fuelOptions = [
  { label: 'Any fuel' },
  { label: 'Petrol', value: 'petrol' },
  { label: 'Diesel', value: 'diesel' },
  { label: 'Electric', value: 'electric' },
  { label: 'Hybrid', value: 'hybrid' },
] satisfies Array<{ label: string; value?: string }>;

const seatOptions = [
  { label: 'Any seats' },
  { label: '4+ seats', value: 4 },
  { label: '5+ seats', value: 5 },
  { label: '7+ seats', value: 7 },
] satisfies Array<{ label: string; value?: number }>;

type VehicleFilters = Pick<
  VehicleSearchParams,
  | 'vehicleType'
  | 'transmission'
  | 'fuelType'
  | 'minSeats'
  | 'minPrice'
  | 'maxPrice'
>;

function getParam(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export function SearchResultsScreen() {
  const params = useLocalSearchParams<{
    locationId?: string;
    pickupDateTime?: string;
    returnDateTime?: string;
  }>();
  const locationId = getParam(params.locationId);
  const pickupDateTime = getParam(params.pickupDateTime);
  const returnDateTime = getParam(params.returnDateTime);
  const hasParams = Boolean(locationId && pickupDateTime && returnDateTime);
  const [filters, setFilters] = useState<VehicleFilters>({});
  const [sort, setSort] = useState<VehicleSearchSort>('recommended');
  const [favoriteIds, setFavoriteIds] = useState<Set<string>>(() => new Set());
  const [isFilterSheetOpen, setFilterSheetOpen] = useState(false);
  const [isSortSheetOpen, setSortSheetOpen] = useState(false);
  const [draftFilters, setDraftFilters] = useState<VehicleFilters>({});

  const closeOverlayBeforeBack = useCallback(() => {
    if (isSortSheetOpen) {
      setSortSheetOpen(false);
      return true;
    }

    if (isFilterSheetOpen) {
      setFilterSheetOpen(false);
      return true;
    }

    return false;
  }, [isFilterSheetOpen, isSortSheetOpen]);
  const goBack = useSafeBack({
    fallback: '/(customer)/home',
    onBeforeBack: closeOverlayBeforeBack,
  });
  useWebBackGuard({
    active: isFilterSheetOpen || isSortSheetOpen,
    onBack: closeOverlayBeforeBack,
  });

  const vehiclesQuery = useInfiniteQuery({
    enabled: hasParams,
    initialPageParam: 1,
    queryKey: [
      'vehicles',
      'search',
      locationId,
      pickupDateTime,
      returnDateTime,
      filters,
      sort,
    ],
    queryFn: ({ pageParam }) =>
      carsApi.searchVehicles({
        locationId: locationId ?? '',
        startsAt: pickupDateTime ?? '',
        endsAt: returnDateTime ?? '',
        ...filters,
        sort,
        page: pageParam,
        limit: pageSize,
      }),
    getNextPageParam: (lastPage) =>
      lastPage.meta.hasNextPage ? lastPage.meta.page + 1 : undefined,
  });

  const fetchedVehicles = useMemo(
    () => vehiclesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [vehiclesQuery.data],
  );
  const vehicles = fetchedVehicles;
  const total = vehiclesQuery.data?.pages[0]?.meta.total ?? 0;
  const isRefreshing =
    vehiclesQuery.isRefetching && !vehiclesQuery.isFetchingNextPage;
  const activeFilterCount = Object.values(filters).filter(
    (value) => value !== undefined,
  ).length;

  const toggleFavorite = (vehicleId: string) => {
    setFavoriteIds((current) => {
      const next = new Set(current);

      if (next.has(vehicleId)) {
        next.delete(vehicleId);
      } else {
        next.add(vehicleId);
      }

      return next;
    });
  };

  const loadNextPage = () => {
    if (vehiclesQuery.hasNextPage && !vehiclesQuery.isFetchingNextPage) {
      void vehiclesQuery.fetchNextPage();
    }
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={goBack}
            style={styles.iconButton}
          >
            <ArrowLeft color="#111827" size={22} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text style={styles.title}>Available cars</Text>
            <Text numberOfLines={1} style={styles.subtitle}>
              {hasParams
                ? `${total} cars for your trip`
                : 'Search details missing'}
            </Text>
          </View>
        </View>

        {hasParams ? (
          <View style={styles.actionRow}>
            <Pressable
              accessibilityLabel="Sort cars"
              accessibilityRole="button"
              onPress={() => setSortSheetOpen(true)}
              style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
            >
              <ArrowDownUp color={colors.ink} size={18} />
              <Text style={styles.actionButtonText}>Sort</Text>
              <ChevronDown color={colors.muted} size={16} />
            </Pressable>
            <Pressable
              accessibilityLabel="Filter cars"
              accessibilityRole="button"
              onPress={() => {
                setDraftFilters(filters);
                setFilterSheetOpen(true);
              }}
              style={({ pressed }) => [styles.actionButton, pressed && styles.pressed]}
            >
              <SlidersHorizontal color={colors.ink} size={18} />
              <Text style={styles.actionButtonText}>Filter</Text>
              {activeFilterCount > 0 ? (
                <View style={styles.filterCountBadge}>
                  <Text style={styles.filterCountText}>{activeFilterCount}</Text>
                </View>
              ) : null}
            </Pressable>
          </View>
        ) : null}

        {!hasParams ? (
          <StateMessage
            body="Choose a pickup location and rental window from Home."
            title="Missing search details"
          />
        ) : vehiclesQuery.isLoading ? (
          <SearchSkeleton />
        ) : vehiclesQuery.isError ? (
          <StateMessage
            actionLabel="Try again"
            body="The backend could not load vehicles for this search."
            onAction={() => void vehiclesQuery.refetch()}
            title="Search failed"
          />
        ) : (
          <FlatList
            ListEmptyComponent={
              <StateMessage
                body="Adjust filters, pickup time, or location."
                title="No cars available"
              />
            }
            ListFooterComponent={
              vehiclesQuery.isFetchingNextPage ? (
                <View style={styles.footerLoader}>
                  <ActivityIndicator color="#111827" />
                </View>
              ) : null
            }
            contentContainerStyle={styles.list}
            data={vehicles}
            keyExtractor={(item) => item.id}
            onEndReached={loadNextPage}
            onEndReachedThreshold={0.55}
            refreshControl={
              <RefreshControl
                onRefresh={() => void vehiclesQuery.refetch()}
                refreshing={isRefreshing}
              />
            }
            renderItem={({ item }) => (
              <VehicleResultCard
                isFavorite={favoriteIds.has(item.id)}
                onFavoritePress={() => toggleFavorite(item.id)}
                onPress={() =>
                  router.push({
                    pathname: '/(customer)/vehicles/[id]',
                    params: {
                      id: item.id,
                      locationId: locationId ?? '',
                      origin: 'search-results',
                      pickupDateTime: pickupDateTime ?? '',
                      returnDateTime: returnDateTime ?? '',
                    },
                  })
                }
                vehicle={item}
              />
            )}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>
      <FilterSheet
        draftFilters={draftFilters}
        isVisible={isFilterSheetOpen}
        resultCount={total}
        onApply={(nextFilters) => {
          setFilters(nextFilters);
          setFilterSheetOpen(false);
        }}
        onClose={() => setFilterSheetOpen(false)}
        onChange={setDraftFilters}
        onReset={() => setDraftFilters({})}
      />
      <SortSheet
        isVisible={isSortSheetOpen}
        selectedSort={sort}
        onClose={() => setSortSheetOpen(false)}
        onSelect={(nextSort) => {
          setSort(nextSort);
          setSortSheetOpen(false);
        }}
      />
      <BottomNavigation />
    </SafeAreaView>
  );
}

type FilterOption<T extends string | number | undefined = string> = {
  label: string;
  value?: T;
  minPrice?: number;
  maxPrice?: number;
};

function FilterSheet({
  draftFilters,
  isVisible,
  resultCount,
  onApply,
  onChange,
  onClose,
  onReset,
}: {
  draftFilters: VehicleFilters;
  isVisible: boolean;
  resultCount: number;
  onApply: (filters: VehicleFilters) => void;
  onChange: (filters: VehicleFilters) => void;
  onClose: () => void;
  onReset: () => void;
}) {
  const selectedPrice =
    priceOptions.find(
      (option) =>
        option.minPrice === draftFilters.minPrice &&
        option.maxPrice === draftFilters.maxPrice,
    ) ?? priceOptions[0];

  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={isVisible}
    >
      <View style={styles.sheetOverlay}>
        <Pressable
          accessibilityLabel="Close filters"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.sheetBackdrop}
        />
        <View style={styles.filterSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Filters</Text>
            <Pressable
              accessibilityRole="button"
              onPress={onReset}
              style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}
            >
              <Text style={styles.resetText}>Reset</Text>
            </Pressable>
          </View>

          <ScrollView
            contentContainerStyle={styles.sheetContent}
            showsVerticalScrollIndicator={false}
          >
            <FilterSection
              icon={CircleDollarSign}
              options={priceOptions}
              selectedValue={selectedPrice.label}
              title="Price range"
              onSelect={(option) =>
                onChange({
                  ...draftFilters,
                  minPrice: option.minPrice,
                  maxPrice: option.maxPrice,
                })
              }
            />
            <FilterSection
              icon={CarFront}
              options={typeOptions}
              selectedValue={draftFilters.vehicleType ?? 'All types'}
              title="Car type"
              onSelect={(option) =>
                onChange({ ...draftFilters, vehicleType: option.value })
              }
            />
            <FilterSection
              icon={Settings2}
              options={transmissionOptions}
              selectedValue={draftFilters.transmission ?? 'Any transmission'}
              title="Transmission"
              onSelect={(option) =>
                onChange({ ...draftFilters, transmission: option.value })
              }
            />
            <FilterSection
              icon={Fuel}
              options={fuelOptions}
              selectedValue={draftFilters.fuelType ?? 'Any fuel'}
              title="Fuel type"
              onSelect={(option) =>
                onChange({ ...draftFilters, fuelType: option.value })
              }
            />
            <FilterSection
              icon={Armchair}
              options={seatOptions}
              selectedValue={draftFilters.minSeats ?? 'Any seats'}
              title="Seats"
              onSelect={(option) =>
                onChange({ ...draftFilters, minSeats: option.value })
              }
            />
          </ScrollView>

          <View style={styles.sheetFooter}>
            <Pressable
              accessibilityRole="button"
              onPress={onReset}
              style={({ pressed }) => [styles.clearButton, pressed && styles.pressed]}
            >
              <Text style={styles.clearButtonText}>Clear all</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              onPress={() => onApply(draftFilters)}
              style={({ pressed }) => [styles.showButton, pressed && styles.showButtonPressed]}
            >
              <Text style={styles.showButtonText}>Show {resultCount} cars</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

function FilterSection<T extends string | number | undefined>({
  icon,
  options,
  selectedValue,
  title,
  onSelect,
}: {
  icon: LucideIcon;
  options: Array<FilterOption<T>>;
  selectedValue: T | string;
  title: string;
  onSelect: (option: FilterOption<T>) => void;
}) {
  const Icon = icon;

  return (
    <View style={styles.filterSection}>
      <View style={styles.filterSectionHeader}>
        <View style={styles.filterIcon}>
          <Icon color={colors.ink} size={18} />
        </View>
        <Text style={styles.filterSectionTitle}>{title}</Text>
      </View>
      <View style={styles.chipWrap}>
        {options.map((option) => {
          const optionValue = option.value ?? option.label;
          const selected = selectedValue === optionValue;

          return (
            <Pressable
              accessibilityLabel={`${title}: ${option.label}`}
              accessibilityRole="button"
              key={`${title}-${option.label}`}
              onPress={() => onSelect(option)}
              style={({ pressed }) => [
                styles.chip,
                selected && styles.chipSelected,
                pressed && styles.pressed,
              ]}
            >
              <Text style={[styles.chipText, selected && styles.chipTextSelected]}>
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

function SortSheet({
  isVisible,
  selectedSort,
  onClose,
  onSelect,
}: {
  isVisible: boolean;
  selectedSort: VehicleSearchSort;
  onClose: () => void;
  onSelect: (sort: VehicleSearchSort) => void;
}) {
  return (
    <Modal
      animationType="slide"
      onRequestClose={onClose}
      transparent
      visible={isVisible}
    >
      <View style={styles.sheetOverlay}>
        <Pressable
          accessibilityLabel="Close sort options"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.sheetBackdrop}
        />
        <View style={styles.sortSheet}>
          <View style={styles.sheetHandle} />
          <View style={styles.sheetHeader}>
            <Text style={styles.sheetTitle}>Sort by</Text>
            <Pressable
              accessibilityRole="button"
              onPress={onClose}
              style={({ pressed }) => [styles.resetButton, pressed && styles.pressed]}
            >
              <Text style={styles.resetText}>Done</Text>
            </Pressable>
          </View>
          <View style={styles.sortOptions}>
            {sortOptions.map((option) => {
              const selected = selectedSort === option.value;

              return (
                <Pressable
                  accessibilityRole="radio"
                  accessibilityState={{ selected }}
                  key={option.value}
                  onPress={() => onSelect(option.value)}
                  style={({ pressed }) => [
                    styles.sortOption,
                    selected && styles.sortOptionSelected,
                    pressed && styles.pressed,
                  ]}
                >
                  <Text style={[styles.sortOptionText, selected && styles.sortOptionTextSelected]}>
                    {option.label}
                  </Text>
                  {selected ? <Text style={styles.sortCheck}>✓</Text> : null}
                </Pressable>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

function VehicleResultCard({
  isFavorite,
  onFavoritePress,
  onPress,
  vehicle,
}: {
  isFavorite: boolean;
  onFavoritePress: () => void;
  onPress: () => void;
  vehicle: VehicleSearchResult;
}) {
  const imageUrl = getCarImageUrl(vehicle.imageUrl);
  const locationLabel = [vehicle.location.name, vehicle.location.city]
    .filter(Boolean)
    .join(' · ');

  return (
    <View style={styles.vehicleCard}>
      <Pressable
        accessibilityRole="button"
        onPress={onPress}
        style={({ pressed }) => [styles.vehicleCardButton, pressed && styles.pressed]}
      >
        <View style={styles.vehicleImageFrame}>
          {imageUrl ? (
            <Image source={{ uri: imageUrl }} style={styles.vehicleImage} />
          ) : (
            <View style={styles.vehicleImageFallback}>
              <CarFront color="#0F172A" size={42} />
            </View>
          )}
        </View>

        <View style={styles.vehicleBody}>
          <View style={styles.vehicleTitleRow}>
            <Text numberOfLines={1} style={styles.vehicleTitle}>
              {vehicle.make} {vehicle.model}
            </Text>
            <View style={styles.ratingPill}>
              <Star color="#F59E0B" fill="#F59E0B" size={13} />
              <Text style={styles.ratingText}>
                {vehicle.rating > 0 ? vehicle.rating.toFixed(1) : 'New'}
              </Text>
            </View>
          </View>

          <View style={styles.vehicleMetaGrid}>
            <Text style={styles.vehicleMeta}>{vehicle.transmission}</Text>
            <Text style={styles.vehicleMeta}>{vehicle.fuelType}</Text>
            <View style={styles.seatsRow}>
              <Users color="#6B7280" size={14} />
              <Text style={styles.vehicleMeta}>{vehicle.seats} seats</Text>
            </View>
          </View>

          <View style={styles.locationRow}>
            <MapPin color="#6B7280" size={15} />
            <Text numberOfLines={1} style={styles.locationText}>
              {vehicle.distanceKm === null
                ? locationLabel || 'Pickup location'
                : `${vehicle.distanceKm.toFixed(1)} km away`}
            </Text>
          </View>

          <View style={styles.priceRow}>
            <View>
              <Text style={styles.dailyPrice}>
                {formatDailyPrice(vehicle.dailyPrice)}/day
              </Text>
              <Text style={styles.totalPrice}>
                {formatMoney(vehicle.estimatedTotalPrice)} total
              </Text>
            </View>
            <View style={styles.rentalDaysPill}>
              <Text style={styles.rentalDaysText}>{vehicle.rentalDays} day trip</Text>
              <ChevronDown color="#111827" size={14} />
            </View>
          </View>
        </View>
      </Pressable>
      <Pressable
        accessibilityLabel={isFavorite ? 'Remove favorite' : 'Add favorite'}
        accessibilityRole="button"
        onPress={onFavoritePress}
        style={({ pressed }) => [styles.favoriteButton, pressed && styles.pressed]}
      >
        <Heart
          color={isFavorite ? '#DC2626' : '#111827'}
          fill={isFavorite ? '#DC2626' : 'transparent'}
          size={19}
        />
      </Pressable>
    </View>
  );
}

function SearchSkeleton() {
  return (
    <View style={styles.skeletonContainer}>
      {[0, 1, 2].map((item) => (
        <View key={item} style={styles.skeletonCard}>
          <View style={styles.skeletonImage} />
          <View style={styles.skeletonLineWide} />
          <View style={styles.skeletonLine} />
          <View style={styles.skeletonLineShort} />
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
    <View style={styles.stateMessage}>
      <Text style={styles.stateTitle}>{title}</Text>
      <Text style={styles.stateBody}>{body}</Text>
      {actionLabel && onAction ? (
        <Pressable
          accessibilityRole="button"
          onPress={onAction}
          style={styles.stateAction}
        >
          <Text style={styles.stateActionText}>{actionLabel}</Text>
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
  container: {
    flex: 1,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 88,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 14,
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
  headerCopy: {
    flex: 1,
    gap: 3,
  },
  title: {
    color: '#111827',
    fontSize: 24,
    fontWeight: '900',
  },
  subtitle: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
  },
  list: {
    gap: 14,
    paddingBottom: 24,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 14,
  },
  actionButton: {
    minHeight: 46,
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  actionButtonText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  filterCountBadge: {
    minHeight: 20,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.brand,
    paddingHorizontal: 5,
  },
  filterCountText: {
    color: colors.surface,
    fontSize: 11,
    fontWeight: '900',
  },
  sheetOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheetBackdrop: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(15, 23, 42, 0.54)',
  },
  filterSheet: {
    height: '82%',
    overflow: 'hidden',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
    ...shadows.floating,
  },
  sortSheet: {
    minHeight: 300,
    overflow: 'hidden',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.surface,
    paddingBottom: 24,
    ...shadows.floating,
  },
  sheetHandle: {
    alignSelf: 'center',
    height: 5,
    width: 46,
    marginTop: 10,
    borderRadius: radii.pill,
    backgroundColor: '#CBD5E1',
  },
  sheetHeader: {
    minHeight: 68,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingHorizontal: 20,
  },
  sheetTitle: {
    color: colors.ink,
    fontSize: 22,
    fontWeight: '900',
  },
  resetButton: {
    minHeight: 42,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  resetText: {
    color: colors.brand,
    fontSize: 15,
    fontWeight: '900',
  },
  sheetContent: {
    gap: 20,
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 18,
  },
  filterSection: {
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 18,
  },
  filterSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  filterIcon: {
    height: 30,
    width: 30,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
  },
  filterSectionTitle: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  chipWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    minHeight: 42,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.pill,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 15,
  },
  chipSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brand,
  },
  chipText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '800',
  },
  chipTextSelected: {
    color: colors.surface,
  },
  sheetFooter: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 20,
    paddingTop: 14,
    paddingBottom: 16,
  },
  clearButton: {
    minHeight: 52,
    minWidth: 106,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    paddingHorizontal: 14,
  },
  clearButtonText: {
    color: colors.ink,
    fontSize: 14,
    fontWeight: '900',
  },
  showButton: {
    minHeight: 52,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.brand,
    paddingHorizontal: 14,
  },
  showButtonPressed: {
    backgroundColor: colors.brandPressed,
  },
  showButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '900',
  },
  sortOptions: {
    gap: 10,
    padding: 20,
  },
  sortOption: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surfaceMuted,
    paddingHorizontal: 16,
  },
  sortOptionSelected: {
    borderColor: colors.brand,
    backgroundColor: colors.brandSoft,
  },
  sortOptionText: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '800',
  },
  sortOptionTextSelected: {
    color: colors.brand,
  },
  sortCheck: {
    color: colors.brand,
    fontSize: 20,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.8,
  },
  vehicleCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  vehicleCardButton: {
    width: '100%',
  },
  vehicleImageFrame: {
    height: 178,
    backgroundColor: '#E5E7EB',
  },
  vehicleImage: {
    height: '100%',
    width: '100%',
  },
  vehicleImageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF2FF',
  },
  favoriteButton: {
    position: 'absolute',
    top: 12,
    right: 12,
    height: 38,
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    backgroundColor: 'rgba(255,255,255,0.92)',
  },
  vehicleBody: {
    gap: 11,
    padding: 14,
  },
  vehicleTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  vehicleTitle: {
    flex: 1,
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  ratingPill: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    backgroundColor: '#FFFBEB',
    paddingHorizontal: 8,
  },
  ratingText: {
    color: '#92400E',
    fontSize: 12,
    fontWeight: '900',
  },
  vehicleMetaGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    gap: 8,
  },
  vehicleMeta: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '800',
    textTransform: 'capitalize',
  },
  seatsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    flex: 1,
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    gap: 12,
  },
  dailyPrice: {
    color: '#111827',
    fontSize: 18,
    fontWeight: '900',
  },
  totalPrice: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '800',
  },
  rentalDaysPill: {
    minHeight: 32,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: 8,
    backgroundColor: '#F3F4F6',
    paddingHorizontal: 9,
  },
  rentalDaysText: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '900',
  },
  footerLoader: {
    paddingVertical: 18,
  },
  skeletonContainer: {
    gap: 14,
  },
  skeletonCard: {
    gap: 12,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 12,
  },
  skeletonImage: {
    height: 160,
    borderRadius: 8,
    backgroundColor: '#E5E7EB',
  },
  skeletonLineWide: {
    height: 18,
    width: '70%',
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  skeletonLine: {
    height: 14,
    width: '52%',
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  skeletonLineShort: {
    height: 14,
    width: '36%',
    borderRadius: 4,
    backgroundColor: '#E5E7EB',
  },
  stateMessage: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingHorizontal: 24,
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
  stateAction: {
    minHeight: 42,
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0B4FE8',
    paddingHorizontal: 18,
    marginTop: 6,
  },
  stateActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
