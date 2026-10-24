import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { carsApi } from '@/services/cars/cars-api';
import { locationsApi } from '@/services/locations/locations-api';
import { BottomNavigation } from '@/features/customer/components/bottom-navigation';
import { CustomerHeader } from '@/features/customer/components/customer-header';
import {
  DateTimePickerSheet,
  type DateTimeField,
} from '@/features/customer/components/date-time-picker-sheet';
import { RentalSearchCard } from '@/features/customer/components/rental-search-card';
import {
  HomeCategorySection,
  type HomeCategory,
} from '@/features/home/components/home-category-section';
import {
  HomeIntentCarousel,
  type HomeIntent,
} from '@/features/home/components/home-intent-carousel';
import { HomeHero } from '@/features/home/components/home-hero';
import { useAuthStore } from '@/store/auth-store';
import { useCustomerSearchStore } from '@/store/customer-search-store';
import { useSafeBack } from '@/hooks/use-safe-back';
import {
  getRentalWindowError,
} from '@/features/customer/utils/rental-window';
import {
  toSearchRouteParams,
  type SearchFilters,
} from '@/features/customer/utils/search-route-state';
import { type VehicleSearchSort } from '@/types/car';

const homeIntents: HomeIntent[] = [
  {
    id: 'weekend',
    title: 'Drive More\nOut of Bengaluru',
    description: 'Premium cars for city drives, weekend escapes and everything in between.',
    action: 'Explore Now',
    filters: { minSeats: 5 },
    sort: 'recommended',
    vehicleType: 'suv',
  },
  {
    id: 'city',
    title: 'Made for city drives',
    description: 'Comfortable cars for everyday plans.',
    action: 'Explore city cars',
    filters: { vehicleType: 'hatchback' },
    sort: 'distance',
    vehicleType: 'hatchback',
  },
  {
    id: 'space',
    title: 'More room for every plan',
    description: 'Find spacious cars for people and luggage.',
    action: 'View spacious cars',
    filters: { minSeats: 7 },
    sort: 'recommended',
    vehicleType: 'suv',
  },
];

export function HomeScreen() {
  const user = useAuthStore((state) => state.user);
  const selectedLocation = useCustomerSearchStore((state) => state.selectedLocation);
  const rentalWindow = useCustomerSearchStore((state) => state.rentalWindow);
  const setSelectedLocation = useCustomerSearchStore(
    (state) => state.setSelectedLocation,
  );
  const setRentalWindow = useCustomerSearchStore((state) => state.setRentalWindow);
  const [activeDateTimeField, setActiveDateTimeField] =
    useState<DateTimeField | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const closePickerBeforeBack = useCallback(() => {
    if (!activeDateTimeField) {
      return false;
    }

    setActiveDateTimeField(null);
    return true;
  }, [activeDateTimeField]);
  useSafeBack({ onBeforeBack: closePickerBeforeBack });

  const defaultLocationQuery = useQuery({
    queryKey: ['locations', 'default', 'bengaluru'],
    queryFn: () => locationsApi.search('bengaluru', 1),
    select: (locations) => locations[0] ?? null,
  });

  useEffect(() => {
    if (!selectedLocation && defaultLocationQuery.data) {
      setSelectedLocation(defaultLocationQuery.data);
    }
  }, [defaultLocationQuery.data, selectedLocation, setSelectedLocation]);

  const location = selectedLocation ?? defaultLocationQuery.data ?? null;

  const carsQuery = useQuery({
    enabled: Boolean(location?.id),
    queryKey: [
      'cars',
      'available',
      location?.id,
      rentalWindow.pickupAt.toISOString(),
      rentalWindow.returnAt.toISOString(),
    ],
    queryFn: () =>
      carsApi.searchAvailable({
        locationId: location?.id ?? '',
        pickupAt: rentalWindow.pickupAt.toISOString(),
        returnAt: rentalWindow.returnAt.toISOString(),
      }),
  });

  const availableCars = carsQuery.data ?? [];
  const isRefreshing = defaultLocationQuery.isFetching || carsQuery.isFetching;

  const refreshHome = () => {
    void defaultLocationQuery.refetch();
    void carsQuery.refetch();
  };

  const openSearchResults = (
    filters: SearchFilters = {},
    sort: VehicleSearchSort = 'recommended',
  ) => {
    if (!location) {
      setValidationError('Select a pickup location.');
      return;
    }

    const windowError = getRentalWindowError(rentalWindow);

    if (windowError) {
      setValidationError(windowError);
      return;
    }

    setValidationError(null);
    router.push({
      pathname: '/(customer)/results',
      params: toSearchRouteParams({
        locationId: location.id,
        locationName: location.name,
        locationCity: location.city,
        pickupDateTime: rentalWindow.pickupAt.toISOString(),
        returnDateTime: rentalWindow.returnAt.toISOString(),
        filters,
        sort,
      }),
    });
  };

  const searchCars = () => openSearchResults();

  const handleIntentPress = (intent: HomeIntent) => {
    const pickupTime = rentalWindow.pickupAt?.getTime();
    const returnTime = rentalWindow.returnAt?.getTime();

    if (!Number.isFinite(pickupTime) || !Number.isFinite(returnTime)) {
      setActiveDateTimeField('pickupDate');
      return;
    }

    openSearchResults(intent.filters, intent.sort);
  };

  const handleCategoryPress = (category: HomeCategory) => {
    openSearchResults(category.filters, category.sort);
  };

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        style={styles.scroll}
        refreshControl={
          <RefreshControl onRefresh={refreshHome} refreshing={isRefreshing} />
        }
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.mobileContent}>
          <View style={styles.heroShell}>
            <HomeHero
              header={
                <CustomerHeader
                  onNotificationsPress={() => router.push('/(customer)/notifications')}
                  onProfilePress={() => router.push('/(customer)/profile')}
                  user={user}
                />
              }
            />
          </View>

          <View style={styles.searchCardOffset}>
            <RentalSearchCard
              isSearching={carsQuery.isFetching}
              location={location}
              onDateTimeFieldPress={setActiveDateTimeField}
              onLocationPress={() => router.push('/(customer)/location')}
              onSearch={searchCars}
              rentalWindow={rentalWindow}
              validationError={validationError}
            />
          </View>

          {carsQuery.isError ? (
            <View style={styles.inlineError}>
              <Text style={styles.inlineErrorTitle}>Cars could not be loaded</Text>
              <Text style={styles.inlineErrorBody}>
                Pull to refresh or try search again when the backend is reachable.
              </Text>
            </View>
          ) : null}

          <HomeIntentCarousel
            cars={availableCars}
            intents={homeIntents}
            onIntentPress={handleIntentPress}
          />

          <HomeCategorySection
            cars={availableCars}
            onCategoryPress={handleCategoryPress}
            onSeeAll={searchCars}
          />
        </View>
      </ScrollView>
      <DateTimePickerSheet
        field={activeDateTimeField}
        location={location}
        onApplyRentalWindow={setRentalWindow}
        onClose={() => setActiveDateTimeField(null)}
        rentalWindow={rentalWindow}
      />
      <BottomNavigation />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F4FAFF',
  },
  scrollContent: {
    alignItems: 'center',
    paddingBottom: 30,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  mobileContent: {
    width: '100%',
    maxWidth: 560,
    gap: 14,
    paddingHorizontal: 18,
  },
  heroShell: {
    marginHorizontal: -18,
    overflow: 'hidden',
    borderBottomLeftRadius: 38,
    borderBottomRightRadius: 38,
    backgroundColor: '#EAF6FF',
  },
  searchCardOffset: {
    marginTop: -44,
    zIndex: 2,
  },
  inlineError: {
    gap: 4,
    borderRadius: 8,
    backgroundColor: '#FEF2F2',
    borderWidth: 1,
    borderColor: '#FECACA',
    padding: 14,
  },
  inlineErrorTitle: {
    color: '#991B1B',
    fontSize: 14,
    fontWeight: '900',
  },
  inlineErrorBody: {
    color: '#B91C1C',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 19,
  },
});
