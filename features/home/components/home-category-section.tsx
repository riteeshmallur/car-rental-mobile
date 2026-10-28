import { Image } from 'expo-image';
import { ArrowRight } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { type SearchFilters } from '@/features/customer/utils/search-route-state';
import { type VehicleSearchSort } from '@/types/car';

const categoryArtwork = {
  hatchback: require('@/assets/images/categories/hopin-hatchback-hd.png'),
  luxury: require('@/assets/images/categories/hopin-luxury-hd.png'),
  sedan: require('@/assets/images/categories/hopin-sedan-hd.png'),
  suv: require('@/assets/images/categories/hopin-suv-hd.png'),
} as const;

export type HomeCategory = {
  id: string;
  label: string;
  subtitle: string;
  filters: SearchFilters;
  sort?: VehicleSearchSort;
  vehicleType?: string;
};

type HomeCategorySectionProps = {
  onCategoryPress: (category: HomeCategory) => void;
  onSeeAll: () => void;
};

export function HomeCategorySection({
  onCategoryPress,
  onSeeAll,
}: HomeCategorySectionProps) {
  const { width } = useWindowDimensions();
  const usesCompactHeading = width < 410;
  const categories: HomeCategory[] = [
    { id: 'suv', label: 'SUVs', subtitle: 'Adventure ready', filters: { vehicleType: 'suv' }, vehicleType: 'suv' },
    { id: 'sedan', label: 'Sedans', subtitle: 'For every journey', filters: { vehicleType: 'sedan' }, vehicleType: 'sedan' },
    { id: 'luxury', label: 'Luxury', subtitle: 'Make it special', filters: {}, sort: 'price_high_to_low' },
    { id: 'hatchback', label: 'Hatchbacks', subtitle: 'City smart', filters: { vehicleType: 'hatchback' }, vehicleType: 'hatchback' },
  ];

  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text
          accessibilityRole="header"
          style={[styles.title, usesCompactHeading && styles.titleCompact]}
        >
          Discover by Category
        </Text>
        <Pressable
          accessibilityLabel="See all available cars"
          accessibilityRole="button"
          hitSlop={6}
          onPress={onSeeAll}
          style={({ pressed }) => [styles.seeAllButton, pressed && styles.pressed]}
        >
          <Text style={styles.seeAll}>See all</Text>
          <ArrowRight color="#FF644F" size={19} />
        </Pressable>
      </View>
      <View style={styles.cards}>
        {categories.map((category) => {
          return (
            <Pressable
              accessibilityLabel={`${category.label}, ${category.subtitle}`}
              accessibilityRole="button"
              key={category.id}
              onPress={() => onCategoryPress(category)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              <Image
                accessibilityLabel={`${category.label} category illustration`}
                contentFit="cover"
                contentPosition="center"
                source={categoryArtwork[category.id as keyof typeof categoryArtwork]}
                style={styles.image}
              />
              <View style={styles.cardCopy}>
                <Text style={styles.cardTitle}>{category.label}</Text>
                <Text style={styles.cardSubtitle}>{category.subtitle}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  title: {
    flex: 1,
    color: '#102550',
    fontFamily: 'Georgia',
    fontSize: 27,
    fontWeight: '700',
    lineHeight: 33,
  },
  titleCompact: {
    fontSize: 23,
    lineHeight: 28,
  },
  seeAllButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },
  seeAll: {
    color: '#FF644F',
    fontSize: 14,
    fontWeight: '800',
  },
  cards: {
    alignItems: 'stretch',
    flexDirection: 'row',
    gap: 12,
  },
  card: {
    flex: 1,
    minWidth: 0,
    overflow: 'hidden',
    borderRadius: 18,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6E8FF',
    shadowColor: '#0B6FE8',
    shadowOffset: { height: 4, width: 0 },
    shadowOpacity: 0.12,
    shadowRadius: 9,
    elevation: 2,
  },
  image: {
    height: 70,
    width: '100%',
  },
  cardCopy: {
    gap: 3,
    minHeight: 58,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  cardTitle: {
    color: '#102550',
    flexShrink: 1,
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  cardSubtitle: {
    color: '#536B91',
    flexShrink: 1,
    fontSize: 9,
    fontWeight: '500',
    lineHeight: 12,
  },
  pressed: {
    opacity: 0.78,
  },
});
