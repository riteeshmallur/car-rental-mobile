import { useInfiniteQuery } from '@tanstack/react-query';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  CarFront,
  ChevronDown,
  Heart,
  MapPin,
  SlidersHorizontal,
  Star,
  Users,
} from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Image,
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

const pageSize = 10;

const sortOptions: Array<{ label: string; value: VehicleSearchSort }> = [
  { label: 'Recommended', value: 'recommended' },
  { label: 'Price low to high', value: 'price_low_to_high' },
  { label: 'Price high to low', value: 'price_high_to_low' },
  { label: 'Rating', value: 'rating' },
];

const priceOptions = [
  { label: 'Any price' },
  { label: 'Under Rs 2.5k', maxPrice: 2500 },
  { label: 'Rs 2.5k - 5k', minPrice: 2500, maxPrice: 5000 },
  { label: 'Rs 5k+', minPrice: 5000 },
] satisfies Array<{ label: string; minPrice?: number; maxPrice?: number }>;

const typeOptions = [
  { label: 'All types' },
  { label: 'Hatchback', value: 'hatchback' },
  { label: 'Sedan', value: 'sedan' },
  { label: 'SUV', value: 'suv' },
  { label: 'EV', value: 'ev' },
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
  const goBack = useSafeBack({ fallback: '/(customer)/home' });

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

  const vehicles = useMemo(
    () => vehiclesQuery.data?.pages.flatMap((page) => page.items) ?? [],
    [vehiclesQuery.data],
  );
  const total = vehiclesQuery.data?.pages[0]?.meta.total ?? 0;
  const isRefreshing =
    vehiclesQuery.isRefetching && !vehiclesQuery.isFetchingNextPage;

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
              {hasParams ? `${total} results for your trip` : 'Search details missing'}
            </Text>
          </View>
        </View>

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
            ListHeaderComponent={
              <SearchControls
                filters={filters}
                onChangeFilters={setFilters}
                onChangeSort={setSort}
                sort={sort}
              />
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
      <BottomNavigation />
    </SafeAreaView>
  );
}

function SearchControls({
  filters,
  onChangeFilters,
  onChangeSort,
  sort,
}: {
  filters: VehicleFilters;
  onChangeFilters: (filters: VehicleFilters) => void;
  onChangeSort: (sort: VehicleSearchSort) => void;
  sort: VehicleSearchSort;
}) {
  const selectedPrice =
    priceOptions.find(
      (option) =>
        option.minPrice === filters.minPrice &&
        option.maxPrice === filters.maxPrice,
    ) ?? priceOptions[0];

  return (
    <View style={styles.controls}>
      <View style={styles.controlsHeader}>
        <View style={styles.controlsTitleRow}>
          <SlidersHorizontal color="#111827" size={18} />
          <Text style={styles.controlsTitle}>Filters</Text>
        </View>
        <Pressable
          accessibilityRole="button"
          onPress={() => onChangeFilters({})}
          style={styles.resetButton}
        >
          <Text style={styles.resetText}>Reset</Text>
        </Pressable>
      </View>

      <FilterRow
        options={sortOptions}
        selectedValue={sort}
        title="Sort"
        onSelect={(option) => onChangeSort(option.value ?? 'recommended')}
      />
      <FilterRow
        options={priceOptions}
        selectedValue={selectedPrice.label}
        title="Price"
        onSelect={(option) =>
          onChangeFilters({
            ...filters,
            minPrice: option.minPrice,
            maxPrice: option.maxPrice,
          })
        }
      />
      <FilterRow
        options={typeOptions}
        selectedValue={filters.vehicleType}
        title="Car type"
        onSelect={(option) =>
          onChangeFilters({ ...filters, vehicleType: option.value })
        }
      />
      <FilterRow
        options={transmissionOptions}
        selectedValue={filters.transmission}
        title="Transmission"
        onSelect={(option) =>
          onChangeFilters({ ...filters, transmission: option.value })
        }
      />
      <FilterRow
        options={fuelOptions}
        selectedValue={filters.fuelType}
        title="Fuel type"
        onSelect={(option) =>
          onChangeFilters({ ...filters, fuelType: option.value })
        }
      />
      <FilterRow
        options={seatOptions}
        selectedValue={filters.minSeats}
        title="Seats"
        onSelect={(option) =>
          onChangeFilters({ ...filters, minSeats: option.value })
        }
      />
    </View>
  );
}

function FilterRow<T extends string | number | undefined>({
  options,
  selectedValue,
  title,
  onSelect,
}: {
  options: Array<{ label: string; value?: T; minPrice?: number; maxPrice?: number }>;
  selectedValue?: T | string;
  title: string;
  onSelect: (option: {
    label: string;
    value?: T;
    minPrice?: number;
    maxPrice?: number;
  }) => void;
}) {
  return (
    <View style={styles.filterGroup}>
      <Text style={styles.filterTitle}>{title}</Text>
      <ScrollView
        contentContainerStyle={styles.chipRow}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
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
      </ScrollView>
    </View>
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
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.vehicleCard, pressed && styles.pressed]}
    >
      <View style={styles.vehicleImageFrame}>
        {imageUrl ? (
          <Image source={{ uri: imageUrl }} style={styles.vehicleImage} />
        ) : (
          <View style={styles.vehicleImageFallback}>
            <CarFront color="#0F172A" size={42} />
          </View>
        )}
        <Pressable
          accessibilityLabel={isFavorite ? 'Remove favorite' : 'Add favorite'}
          accessibilityRole="button"
          onPress={(event) => {
            event.stopPropagation();
            onFavoritePress();
          }}
          style={styles.favoriteButton}
        >
          <Heart
            color={isFavorite ? '#DC2626' : '#111827'}
            fill={isFavorite ? '#DC2626' : 'transparent'}
            size={19}
          />
        </Pressable>
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
    backgroundColor: '#F8FAFC',
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
  controls: {
    gap: 14,
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  controlsHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  controlsTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  controlsTitle: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '900',
  },
  resetButton: {
    minHeight: 34,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  resetText: {
    color: '#2563EB',
    fontSize: 13,
    fontWeight: '900',
  },
  filterGroup: {
    gap: 8,
  },
  filterTitle: {
    color: '#374151',
    fontSize: 12,
    fontWeight: '900',
    textTransform: 'uppercase',
  },
  chipRow: {
    gap: 8,
    paddingRight: 4,
  },
  chip: {
    minHeight: 36,
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 12,
  },
  chipSelected: {
    borderColor: '#111827',
    backgroundColor: '#111827',
  },
  chipText: {
    color: '#374151',
    fontSize: 13,
    fontWeight: '800',
  },
  chipTextSelected: {
    color: '#FFFFFF',
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
    backgroundColor: '#E0F2FE',
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
    backgroundColor: '#111827',
    paddingHorizontal: 18,
    marginTop: 6,
  },
  stateActionText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '900',
  },
});
