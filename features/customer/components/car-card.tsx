import { Check, Heart } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import {
  formatDailyPrice,
  getVehicleImageVariantUrl,
} from '@/features/customer/utils/car-formatters';
import { CachedVehicleImage } from '@/features/customer/components/cached-vehicle-image';
import { type Car } from '@/types/car';
import { colors, radii, shadows } from '@/utils/theme';

type CarCardProps = {
  car: Car;
  onPress?: () => void;
  size?: 'compact' | 'large';
};

export function CarCard({ car, onPress, size = 'compact' }: CarCardProps) {
  const imageUrl = getVehicleImageVariantUrl(car.imageUrl, 'thumbnail');
  const isLarge = size === 'large';

  return (
    <Pressable
      accessibilityHint="Opens vehicle details."
      accessibilityLabel={`${car.make} ${car.model}, ${formatDailyPrice(car.pricePerDay)} per day, available`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [
        styles.card,
        isLarge && styles.cardLarge,
        pressed && styles.cardPressed,
      ]}
    >
      <View style={styles.imageFrame}>
        {imageUrl ? (
          <CachedVehicleImage contentFit="contain" style={styles.image} uri={imageUrl} />
        ) : (
          <View style={styles.imageFallback}>
            <Text style={styles.imageFallbackText}>{car.make.slice(0, 1)}</Text>
          </View>
        )}
      </View>

      <View style={styles.copy}>
        <View style={styles.titleRow}>
          <Text numberOfLines={1} style={styles.name}>
            {car.make} {car.model}
          </Text>
          <View accessible={false}>
            <Heart color={colors.muted} size={21} />
          </View>
        </View>
        <Text numberOfLines={1} style={styles.meta}>
          {car.manufacturingYear} · {car.transmission} · {car.seats} seats
        </Text>
        <View style={styles.availableChip}>
          <Check color={colors.success} size={12} strokeWidth={3} />
          <Text style={styles.availableText}>Available</Text>
        </View>
        <View style={styles.footer}>
          <View style={styles.priceRow}>
            <Text style={styles.price}>{formatDailyPrice(car.pricePerDay)}</Text>
            <Text style={styles.priceSuffix}>/ day</Text>
          </View>
          <View style={styles.bookButton}>
            <Text style={styles.bookButtonText}>Book now</Text>
          </View>
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 154,
    flexDirection: 'row',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.lg,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  cardLarge: {
    minHeight: 164,
  },
  cardPressed: {
    opacity: 0.86,
  },
  imageFrame: {
    width: '42%',
    minWidth: 0,
    backgroundColor: colors.surfaceMuted,
    padding: 8,
  },
  image: {
    height: '100%',
    width: '100%',
  },
  imageFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.brandSoft,
  },
  imageFallbackText: {
    color: colors.brand,
    fontSize: 44,
    fontWeight: '900',
  },
  copy: {
    minWidth: 0,
    flex: 1,
    justifyContent: 'center',
    gap: 8,
    padding: 13,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  name: {
    flex: 1,
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  meta: {
    color: colors.text,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'capitalize',
  },
  availableChip: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    borderRadius: radii.pill,
    backgroundColor: colors.successSoft,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  availableText: {
    color: colors.success,
    fontSize: 11,
    fontWeight: '800',
  },
  footer: {
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  priceRow: {
    flexShrink: 1,
    flexWrap: 'wrap',
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 3,
  },
  price: {
    flexShrink: 1,
    color: colors.brand,
    fontSize: 20,
    fontWeight: '900',
  },
  priceSuffix: {
    color: colors.text,
    fontSize: 11,
    fontWeight: '700',
  },
  bookButton: {
    minHeight: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.sm,
    backgroundColor: colors.brand,
    paddingHorizontal: 12,
  },
  bookButtonText: {
    color: colors.surface,
    fontSize: 12,
    fontWeight: '900',
  },
});
