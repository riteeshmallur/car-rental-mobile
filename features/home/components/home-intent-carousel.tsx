import { ArrowRight } from 'lucide-react-native';
import { Image } from 'expo-image';
import { useState } from 'react';
import {
  FlatList,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  type ViewStyle,
} from 'react-native';

import { type SearchFilters } from '@/features/customer/utils/search-route-state';
import { type VehicleSearchSort } from '@/types/car';

const carouselArtwork = {
  city: require('@/assets/images/hopin-carousel-city-drives.png'),
  space: require('@/assets/images/hopin-carousel-spacious-cars.png'),
  weekend: require('@/assets/images/hopin-carousel-weekend-escapes.png'),
} as const;

const carouselGradient =
  'linear-gradient(90deg, rgba(255,255,255,1) 0%, rgba(255,255,255,0.99) 27%, rgba(255,255,255,0.94) 34%, rgba(255,255,255,0.72) 39%, rgba(255,255,255,0.30) 44%, rgba(255,255,255,0) 50%)';

const webGradientStyle = Platform.OS === 'web'
  ? ({ backgroundImage: carouselGradient } as unknown as ViewStyle)
  : undefined;

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
  intents: HomeIntent[];
  onIntentPress: (intent: HomeIntent) => void;
};

function artworkFor(intent: HomeIntent) {
  return carouselArtwork[intent.id as keyof typeof carouselArtwork] ?? carouselArtwork.weekend;
}

export function HomeIntentCarousel({ intents, onIntentPress }: HomeIntentCarouselProps) {
  const { width } = useWindowDimensions();
  const [activeIndex, setActiveIndex] = useState(0);
  const [containerWidth, setContainerWidth] = useState(0);
  const cardWidth = Math.max(1, containerWidth || Math.min(width - 36, 560));
  const textScale = Math.min(1, Math.max(0.68, cardWidth / 560));
  const copyPadding = Math.round(27 * textScale);

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
          return (
            <Pressable
              accessibilityHint="Applies this search idea and opens available cars."
              accessibilityLabel={`${item.title}. ${item.action}`}
              accessibilityRole="button"
              onPress={() => onIntentPress(item)}
              style={({ pressed }) => [styles.card, { width: cardWidth }, pressed && styles.pressed]}
            >
              <View accessibilityElementsHidden style={styles.imageStage}>
                <Image
                  accessible={false}
                  contentFit="cover"
                  contentPosition="right center"
                  source={artworkFor(item)}
                  style={styles.backgroundImage}
                  transition={120}
                />
              </View>
              <View
                accessibilityElementsHidden
                pointerEvents="none"
                style={[styles.gradientOverlay, webGradientStyle]}
              />
              <View style={[styles.copy, { paddingLeft: copyPadding, paddingRight: Math.round(9 * textScale) }]}>
                <Text numberOfLines={2} style={[styles.title, { fontSize: Math.round(30 * textScale), lineHeight: Math.round(32 * textScale) }]}>{item.title}</Text>
                <Text numberOfLines={3} style={[styles.description, { fontSize: Math.round(16 * textScale), lineHeight: Math.round(22 * textScale) }]}>{item.description}</Text>
                <View style={styles.actionRow}>
                  <Text style={[styles.action, { fontSize: Math.round(20 * textScale) }]}>{item.action}</Text>
                  <ArrowRight color="#FF644F" size={Math.round(28 * textScale)} />
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
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#D6E8FF',
    shadowColor: '#0B6FE8',
    shadowOffset: { height: 7, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 14,
    elevation: 3,
  },
  copy: {
    zIndex: 2,
    width: '53%',
    gap: 9,
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
  imageStage: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    overflow: 'hidden',
  },
  backgroundImage: {
    position: 'absolute',
    top: '-30%',
    right: '-4%',
    height: '160%',
    width: '160%',
  },
  gradientOverlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 1,
    experimental_backgroundImage: carouselGradient,
  },
  dots: {
    position: 'absolute',
    bottom: 14,
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    zIndex: 4,
  },
  dot: {
    height: 10,
    width: 10,
    borderRadius: 5,
    backgroundColor: '#D6E8FF',
  },
  activeDot: {
    width: 25,
    backgroundColor: '#FF644F',
  },
  pressed: {
    opacity: 0.86,
  },
});
