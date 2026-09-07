import { ActivityIndicator, FlatList, StyleSheet, Text, View } from 'react-native';

import { CarCard } from '@/features/customer/components/car-card';
import { type Car } from '@/types/car';

type FeaturedCarListProps = {
  title: string;
  cars: Car[];
  isLoading?: boolean;
  variant?: 'featured' | 'popular';
};

export function FeaturedCarList({
  cars,
  isLoading,
  title,
  variant = 'featured',
}: FeaturedCarListProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.count}>{cars.length} cars</Text>
      </View>

      {isLoading ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color="#111827" />
          <Text style={styles.loadingText}>Loading cars</Text>
        </View>
      ) : (
        <FlatList
          contentContainerStyle={styles.listContent}
          data={cars}
          horizontal
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <CarCard car={item} size={variant === 'featured' ? 'large' : 'compact'} />
          )}
          showsHorizontalScrollIndicator={false}
        />
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
    color: '#111827',
    fontSize: 20,
    fontWeight: '900',
  },
  count: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '800',
  },
  listContent: {
    gap: 14,
    paddingRight: 24,
  },
  loadingRow: {
    minHeight: 180,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  loadingText: {
    color: '#6B7280',
    fontSize: 14,
    fontWeight: '700',
  },
});
