import { useQuery } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
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
import { FeaturedCarList } from '@/features/customer/components/featured-car-list';
import { PromotionalSection } from '@/features/customer/components/promotional-section';
import { RentalSearchCard } from '@/features/customer/components/rental-search-card';
import { useAuthStore } from '@/store/auth-store';
import { useCustomerSearchStore } from '@/store/customer-search-store';
import { useSafeBack } from '@/hooks/use-safe-back';
import {
  getRentalWindowError,
} from '@/features/customer/utils/rental-window';
import { colors } from '@/utils/theme';

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
  const featuredCars = useMemo(() => availableCars.slice(0, 3), [availableCars]);
  const popularCars = useMemo(() => availableCars.slice(1, 4), [availableCars]);
  const isRefreshing = defaultLocationQuery.isFetching || carsQuery.isFetching;

  const refreshHome = () => {
    void defaultLocationQuery.refetch();
    void carsQuery.refetch();
  };

  const searchCars = () => {
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
      params: {
        locationId: location.id,
        pickupDateTime: rentalWindow.pickupAt.toISOString(),
        returnDateTime: rentalWindow.returnAt.toISOString(),
      },
    });
  };

  const openVehicle = (vehicleId: string) => {
    router.push({
      pathname: '/(customer)/vehicles/[id]',
      params: {
        id: vehicleId,
        locationId: location?.id ?? '',
        origin: 'home',
        pickupDateTime: rentalWindow.pickupAt.toISOString(),
        returnDateTime: rentalWindow.returnAt.toISOString(),
      },
    });
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
        <CustomerHeader
          user={user}
        />

        <RentalSearchCard
          isSearching={carsQuery.isFetching}
          location={location}
          onDateTimeFieldPress={setActiveDateTimeField}
          onLocationPress={() => router.push('/(customer)/location')}
          onSearch={searchCars}
          rentalWindow={rentalWindow}
          validationError={validationError}
        />

        {carsQuery.isError ? (
          <View style={styles.inlineError}>
            <Text style={styles.inlineErrorTitle}>Cars could not be loaded</Text>
            <Text style={styles.inlineErrorBody}>
              Pull to refresh or try search again when the backend is reachable.
            </Text>
          </View>
        ) : null}

        <FeaturedCarList
          cars={featuredCars}
          isLoading={carsQuery.isLoading || defaultLocationQuery.isLoading}
          onCarPress={openVehicle}
          onViewAll={searchCars}
          title="Featured cars"
          variant="featured"
        />

        <FeaturedCarList
          cars={popularCars}
          onCarPress={openVehicle}
          onViewAll={searchCars}
          title="Popular cars"
          variant="popular"
        />

        <PromotionalSection />
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
    backgroundColor: colors.background,
  },
  scrollContent: {
    gap: 20,
    paddingHorizontal: 18,
    paddingTop: 14,
    paddingBottom: 24,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
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
