import { Image } from 'expo-image';
import { ArrowRight } from 'lucide-react-native';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { CachedVehicleImage } from '@/features/customer/components/cached-vehicle-image';
import { getVehicleImageVariantUrl } from '@/features/customer/utils/car-formatters';
import { type SearchFilters } from '@/features/customer/utils/search-route-state';
import { type Car, type VehicleSearchSort } from '@/types/car';

const categoryFallbackArtwork = require('@/assets/images/hopin-weekend-escapes.png');

export type HomeCategory = {
  id: string;
  label: string;
  subtitle: string;
  filters: SearchFilters;
  sort?: VehicleSearchSort;
  vehicleType?: string;
};

type HomeCategorySectionProps = {
  cars: Car[];
  onCategoryPress: (category: HomeCategory) => void;
  onSeeAll: () => void;
};

function findCategoryCar(
  cars: Car[],
  category: HomeCategory,
  failedImageUrls: ReadonlySet<string>,
) {
  const hasUsableImage = (car: Car) =>
    Boolean(car.imageUrl) && !failedImageUrls.has(car.imageUrl ?? '');

  if (!category.vehicleType) {
    return cars.find(hasUsableImage) ?? null;
  }

  return cars.find(
    (car) => car.vehicleType.toLowerCase() === category.vehicleType && hasUsableImage(car),
  ) ?? cars.find(hasUsableImage) ?? null;
}

export function HomeCategorySection({
  cars,
  onCategoryPress,
  onSeeAll,
}: HomeCategorySectionProps) {
  const { width } = useWindowDimensions();
  const usesCompactHeading = width < 410;
  const [failedImageUrls, setFailedImageUrls] = useState<Set<string>>(() => new Set());
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
          const car = findCategoryCar(cars, category, failedImageUrls);
          const imageUrl = car?.imageUrl
            ? getVehicleImageVariantUrl(car.imageUrl, 'thumbnail')
            : null;

          return (
            <Pressable
              accessibilityLabel={`${category.label}, ${category.subtitle}`}
              accessibilityRole="button"
              key={category.id}
              onPress={() => onCategoryPress(category)}
              style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            >
              {imageUrl ? (
                <CachedVehicleImage
                  accessibilityLabel={`${category.label} available vehicle`}
                  onError={() => {
                    if (!car?.imageUrl) {
                      return;
                    }

                    setFailedImageUrls((current) => {
                      if (current.has(car.imageUrl ?? '')) {
                        return current;
                      }

                      const next = new Set(current);
                      next.add(car.imageUrl ?? '');
                      return next;
                    });
                  }}
                  style={styles.image}
                  uri={imageUrl}
                />
              ) : (
                <Image
                  accessibilityLabel={`${category.label} category illustration`}
                  contentFit="cover"
                  contentPosition="right center"
                  source={categoryFallbackArtwork}
                  style={styles.imageFallback}
                />
              )}
              <View style={styles.cardCopy}>
                <Text numberOfLines={1} style={styles.cardTitle}>{category.label}</Text>
                <Text numberOfLines={1} style={styles.cardSubtitle}>{category.subtitle}</Text>
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
  imageFallback: {
    height: 70,
    width: '100%',
  },
  cardCopy: {
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 8,
  },
  cardTitle: {
    color: '#102550',
    fontSize: 12,
    fontWeight: '800',
  },
  cardSubtitle: {
    color: '#536B91',
    fontSize: 9,
    fontWeight: '500',
  },
  pressed: {
    opacity: 0.78,
  },
});
