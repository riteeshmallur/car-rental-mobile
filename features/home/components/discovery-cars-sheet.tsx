import { AppText as Text } from '@/components/typography/app-text';
import { X } from 'lucide-react-native';
import { FlatList, Modal, Pressable, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { CarCard } from '@/features/customer/components/car-card';
import { type SearchFilters } from '@/features/customer/utils/search-route-state';
import { type DiscoverableCar, type VehicleSearchSort } from '@/types/car';
import { colors, radii } from '@/utils/theme';

type DiscoveryCarsSheetProps = {
  cars: DiscoverableCar[];
  filters?: SearchFilters;
  isVisible: boolean;
  onCarPress: (vehicleId: string) => void;
  onClose: () => void;
  sort?: VehicleSearchSort;
  title: string;
};

function matchesFilters(vehicle: DiscoverableCar, filters: SearchFilters = {}) {
  const price = Number(vehicle.pricePerDay);

  return (
    (!filters.vehicleType || vehicle.vehicleType === filters.vehicleType) &&
    (!filters.transmission || vehicle.transmission === filters.transmission) &&
    (!filters.minSeats || vehicle.seats >= filters.minSeats) &&
    (!filters.minPrice || price >= filters.minPrice) &&
    (!filters.maxPrice || price <= filters.maxPrice)
  );
}

function sortCars(cars: DiscoverableCar[], sort?: VehicleSearchSort) {
  if (sort === 'price_high_to_low') {
    return [...cars].sort((first, second) => Number(second.pricePerDay) - Number(first.pricePerDay));
  }

  if (sort === 'price_low_to_high') {
    return [...cars].sort((first, second) => Number(first.pricePerDay) - Number(second.pricePerDay));
  }

  return cars;
}

export function DiscoveryCarsSheet({
  cars,
  filters,
  isVisible,
  onCarPress,
  onClose,
  sort,
  title,
}: DiscoveryCarsSheetProps) {
  const visibleCars = sortCars(cars.filter((car) => matchesFilters(car, filters)), sort);

  return (
    <Modal animationType="slide" onRequestClose={onClose} visible={isVisible}>
      <SafeAreaView accessibilityViewIsModal style={styles.safeArea}>
        <View style={styles.header}>
          <View style={styles.headerCopy}>
            <Text accessibilityRole="header" style={styles.title}>{title}</Text>
            <Text style={styles.subtitle}>Choose a car, then enter pickup location, dates and times.</Text>
          </View>
          <Pressable
            accessibilityLabel="Close vehicle discovery"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.closeButton}
          >
            <X color={colors.ink} size={22} />
          </Pressable>
        </View>
        <FlatList
          contentContainerStyle={visibleCars.length ? styles.list : styles.emptyList}
          data={visibleCars}
          keyExtractor={(item) => item.id}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No cars in this category yet</Text>
              <Text style={styles.emptyBody}>Try another category to explore the full HopIn catalogue.</Text>
            </View>
          }
          renderItem={({ item }) => (
            <CarCard car={item} onPress={() => onCarPress(item.id)} />
          )}
          showsVerticalScrollIndicator={false}
        />
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: 16,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerCopy: { flex: 1, gap: 4 },
  title: { color: colors.ink, fontSize: 25, fontWeight: '800' },
  subtitle: { color: colors.muted, fontSize: 13, fontWeight: '600', lineHeight: 19 },
  closeButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: radii.md,
    borderWidth: 1,
    height: 44,
    justifyContent: 'center',
    width: 44,
  },
  list: { gap: 12, padding: 20, paddingTop: 2 },
  emptyList: { flexGrow: 1, justifyContent: 'center', padding: 20 },
  emptyState: { alignItems: 'center', gap: 6, padding: 24 },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '800', textAlign: 'center' },
  emptyBody: { color: colors.muted, fontSize: 14, fontWeight: '600', lineHeight: 21, textAlign: 'center' },
});
