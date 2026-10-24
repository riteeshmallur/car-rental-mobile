import { ArrowRight, CarFront } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
} from 'react-native';

import { CachedVehicleImage } from '@/features/customer/components/cached-vehicle-image';
import { getVehicleImageVariantUrl } from '@/features/customer/utils/car-formatters';
import { type SearchFilters } from '@/features/customer/utils/search-route-state';
import { type Car, type VehicleSearchSort } from '@/types/car';

const weekendEscapesArtwork = require('@/assets/images/hopin-weekend-escapes.png');

export type HomeIntent = {
  id: string;
  title: string;
  description: string;
  action: string;
  filters: SearchFilters;
  sort?: VehicleSearchSort;
  vehicleType?: string;
};

type HomeIntentCarouselProps = {
  cars: Car[];
  intents: HomeIntent[];
  onIntentPress: (intent: HomeIntent) => void;
};

function matchingCar(cars: Car[], intent: HomeIntent) {
  if (!intent.vehicleType) {
    return cars.find((car) => Boolean(car.imageUrl)) ?? null;
  }

  return cars.find(
    (car) => car.vehicleType.toLowerCase() === intent.vehicleType && Boolean(car.imageUrl),
  ) ?? cars.find((car) => Boolean(car.imageUrl)) ?? null;
}

export function HomeIntentCarousel({ cars, intents, onIntentPress }: HomeIntentCarouselProps) {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const cardWidth = Math.max(1, containerWidth || Math.min(width - 36, 560));

  const handleLayout = (event: LayoutChangeEvent) => {
    const nextWidth = Math.round(event.nativeEvent.layout.width);
    setContainerWidth((currentWidth) => currentWidth === nextWidth ? currentWidth : nextWidth);
  };

  const handleMomentumEnd = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const nextIndex = Math.round(event.nativeEvent.contentOffset.x / cardWidth);
    setActiveIndex(Math.max(0, Math.min(nextIndex, intents.length - 1)));
  };

  return (
    <View accessibilityLabel="Car rental ideas" onLayout={handleLayout} style={styles.section}>
      <FlatList
        data={intents}
        decelerationRate="fast"
        horizontal
        keyExtractor={(item) => item.id}
        onMomentumScrollEnd={handleMomentumEnd}
        pagingEnabled
        renderItem={({ item }) => {
          const car = matchingCar(cars, item);
          const imageUrl = car?.imageUrl
            ? getVehicleImageVariantUrl(car.imageUrl, 'thumbnail')
            : null;
          const usesWeekendArtwork = item.id === 'weekend';

          return (
            <Pressable
              accessibilityHint="Applies this search idea and opens available cars."
              accessibilityLabel={`${item.title}. ${item.action}`}
              accessibilityRole="button"
              onPress={() => onIntentPress(item)}
              style={({ pressed }) => [styles.card, { width: cardWidth }, pressed && styles.pressed]}
            >
              {usesWeekendArtwork ? (
                <Image
                  accessible={false}
                  contentFit="cover"
                  contentPosition="center"
                  source={weekendEscapesArtwork}
                  style={styles.image}
                  transition={120}
                />
              ) : imageUrl ? (
                <CachedVehicleImage
                  accessibilityLabel={`${car?.make} ${car?.model}`}
                  style={styles.image}
                  uri={imageUrl}
                />
              ) : (
                <View accessibilityElementsHidden style={styles.fallbackImage}>
                  <CarFront color="#D6E8FF" size={64} />
                </View>
              )}
              <View accessibilityElementsHidden style={styles.copyBackdrop} />
              <View style={styles.copy}>
                <Text numberOfLines={2} style={styles.title}>{item.title}</Text>
                <Text numberOfLines={3} style={styles.description}>{item.description}</Text>
                <View style={styles.actionRow}>
                  <Text style={styles.action}>{item.action}</Text>
                  <ArrowRight color="#FF644F" size={22} />
                </View>
              </View>

            </Pressable>
          );
        }}
        showsHorizontalScrollIndicator={false}
        snapToInterval={cardWidth}
      />
      <View accessibilityElementsHidden style={styles.dots}>
        {intents.map((intent, index) => (
          <View key={intent.id} style={[styles.dot, activeIndex === index && styles.activeDot]} />
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    position: 'relative',
  },
  card: {
    aspectRatio: 2.3,
    minHeight: 166,
    overflow: 'hidden',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6E8FF',
    padding: 18,
    shadowColor: '#0B6FE8',
    shadowOffset: { height: 7, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 3,
  },
  copy: {
    zIndex: 2,
    maxWidth: '57%',
    gap: 8,
  },
  copyBackdrop: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    width: '58%',
    zIndex: 1,
    backgroundColor: '#FFFFFF',
  },
  title: {
    color: '#102550',
    fontFamily: 'Georgia',
    fontSize: 20,
    fontWeight: '700',
    lineHeight: 23,
  },
  description: {
    color: '#536B91',
    fontSize: 11,
    fontWeight: '500',
    lineHeight: 15,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 4,
  },
  action: {
    color: '#FF644F',
    fontSize: 14,
    fontWeight: '800',
  },
  image: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
  },
  fallbackImage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#EAF4FF',
  },
  dots: {
    position: 'absolute',
    bottom: 10,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    zIndex: 4,
  },
  dot: {
    height: 7,
    width: 7,
    borderRadius: 4,
    backgroundColor: '#D6E8FF',
  },
  activeDot: {
    width: 21,
    backgroundColor: '#FF644F',
  },
  pressed: {
    opacity: 0.86,
  },
});
