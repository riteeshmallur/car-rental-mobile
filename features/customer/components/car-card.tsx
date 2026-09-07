import { Heart, Users } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  formatDailyPrice,
  getCarImageUrl,
} from '@/features/customer/utils/car-formatters';
import { type Car } from '@/types/car';

type CarCardProps = {
  car: Car;
  size?: 'compact' | 'large';
};

export function CarCard({ car, size = 'compact' }: CarCardProps) {
  const imageUrl = getCarImageUrl(car.imageUrl);
  const isLarge = size === 'large';

  return (
    <Pressable
      accessibilityRole="button"
      style={({ pressed }) => [
        styles.card,
        isLarge ? styles.cardLarge : styles.cardCompact,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={[styles.imageFrame, isLarge && styles.imageFrameLarge]}>
        {imageUrl ? (
          <Image resizeMode="cover" source={{ uri: imageUrl }} style={styles.image} />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.imageFallbackText}>{car.make.slice(0, 1)}</Text>
          </View>
        )}
        <View style={styles.favoriteButton}>
          <Heart color="#111827" size={17} />
        </View>
      </View>

      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.name}>
            {car.make} {car.model}
          </Text>
          <Text style={styles.year}>{car.manufacturingYear}</Text>
        </View>
        <Text numberOfLines={1} style={styles.meta}>
          {car.transmission} • {car.fuelType}
        </Text>
        <View style={styles.footer}>
          <View style={styles.seatRow}>
            <Users color="#6B7280" size={15} />
            <Text style={styles.seats}>{car.seats} seats</Text>
          </View>
          <Text style={styles.price}>{formatDailyPrice(car.pricePerDay)}/day</Text>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  cardCompact: {
    width: 236,
  },
  cardLarge: {
    width: 280,
  },
  cardPressed: {
    opacity: 0.86,
  },
  imageFrame: {
    height: 128,
    backgroundColor: '#E5E7EB',
  },
  imageFrameLarge: {
    height: 152,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E0F2FE',
  },
  imageFallbackText: {
    color: '#0F172A',
    fontSize: 44,
    fontWeight: '900',
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    height: 34,
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 17,
    backgroundColor: 'rgba(255,255,255,0.9)',
  },
  copy: {
    gap: 8,
    padding: 12,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
    color: '#111827',
    fontSize: 16,
    fontWeight: '900',
  },
  year: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800',
  },
  meta: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
    textTransform: 'capitalize',
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  seatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  seats: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '700',
  },
  price: {
    color: '#111827',
    fontSize: 14,
    fontWeight: '900',
  },
});
