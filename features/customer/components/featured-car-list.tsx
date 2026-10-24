import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { CarCard } from '@/features/customer/components/car-card';
import { type Car } from '@/types/car';
import { colors, radii } from '@/utils/theme';

type FeaturedCarListProps = {
  title: string;
  cars: Car[];
  isLoading?: boolean;
  onCarPress?: (vehicleId: string) => void;
  onViewAll?: () => void;
  variant?: 'featured' | 'popular';
};

export function FeaturedCarList({
  cars,
  isLoading,
  onCarPress,
  onViewAll,
  title,
  variant = 'featured',
}: FeaturedCarListProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text accessibilityRole="header" style={styles.title}>{title}</Text>
        <Pressable
          accessibilityLabel={`View all ${title}`}
          accessibilityRole="button"
          onPress={onViewAll}
        >
          <Text style={styles.viewAll}>View all</Text>
        </Pressable>
      </View>

      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator accessibilityLabel="Loading cars" color="#102550" />
          <Text style={styles.loadingText}>Loading cars</Text>
        </View>
      ) : cars.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyTitle}>No cars available</Text>
          <Text style={styles.emptyBody}>Try another location or rental window.</Text>
        </View>
      ) : (
        <View style={styles.listContent}>
          {cars.map((item) => (
            <CarCard
              key={item.id}
              car={item}
              onPress={() => onCarPress?.(item.id)}
              size={variant === 'featured' ? 'large' : 'compact'}
            />
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    color: colors.ink,
    fontSize: 20,
    fontWeight: '900',
  },
  viewAll: {
    color: colors.brand,
    fontSize: 13,
    fontWeight: '800',
  },
  listContent: {
    gap: 12,
  },
  loadingRow: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: '#D6E8FF',
  },
  loadingText: {
    color: '#536B91',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyState: {
    minHeight: 112,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    padding: 16,
  },
  emptyTitle: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  emptyBody: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
    textAlign: 'center',
  },
});
