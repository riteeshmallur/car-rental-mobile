import {
  ArrowLeftRight,
  CalendarDays,
  ChevronRight,
  Clock,
  Search,
} from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  formatDate,
  formatTime,
  type RentalWindow,
} from '@/features/customer/utils/rental-window';
import { type DateTimeField } from '@/features/customer/components/date-time-picker-sheet';
import { type LocationSearchResult } from '@/types/location';
import { colors, radii, shadows } from '@/utils/theme';

type RentalSearchCardProps = {
  location?: LocationSearchResult | null;
  rentalWindow: RentalWindow;
  validationError?: string | null;
  isSearching?: boolean;
  onDateTimeFieldPress: (field: DateTimeField) => void;
  onLocationPress: () => void;
  onSearch: () => void;
};

export function RentalSearchCard({
  isSearching,
  location,
  onDateTimeFieldPress,
  onLocationPress,
  onSearch,
  rentalWindow,
  validationError,
}: RentalSearchCardProps) {
  const rentalDays = Math.max(
    1,
    Math.ceil(
      (rentalWindow.returnAt.getTime() - rentalWindow.pickupAt.getTime()) /
        (24 * 60 * 60 * 1000),
    ),
  );

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityRole="button"
        onPress={onLocationPress}
        style={({ pressed }) => [styles.locationField, pressed && styles.pressed]}
      >
        <Search color={colors.muted} size={22} />
        <Text numberOfLines={1} style={styles.locationText}>
          {location?.name || 'Where would you like to pick up?'}
        </Text>
      </Pressable>

      <View style={styles.rentalCard}>
        <View style={styles.dateRow}>
          <RentalDate
            date={formatDate(rentalWindow.pickupAt)}
            label="Pick-up"
            onDatePress={() => onDateTimeFieldPress('pickupDate')}
            onTimePress={() => onDateTimeFieldPress('pickupTime')}
            time={formatTime(rentalWindow.pickupAt)}
          />

          <View style={styles.swapColumn}>
            <View style={styles.swapLine} />
            <View style={styles.swapButton}>
              <ArrowLeftRight color={colors.muted} size={18} />
            </View>
            <View style={styles.swapLine} />
          </View>

          <RentalDate
            date={formatDate(rentalWindow.returnAt)}
            label="Drop-off"
            onDatePress={() => onDateTimeFieldPress('returnDate')}
            onTimePress={() => onDateTimeFieldPress('returnTime')}
            time={formatTime(rentalWindow.returnAt)}
          />
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => onDateTimeFieldPress('returnDate')}
          style={({ pressed }) => [styles.durationRow, pressed && styles.pressed]}
        >
          <Clock color={colors.muted} size={19} />
          <Text style={styles.durationLabel}>Rental duration:</Text>
          <Text style={styles.durationValue}>
            {rentalDays} {rentalDays === 1 ? 'Day' : 'Days'}
          </Text>
          <ChevronRight color={colors.text} size={20} />
        </Pressable>
      </View>

      {validationError ? (
        <Text style={styles.validationError}>{validationError}</Text>
      ) : null}

      <Pressable
        accessibilityRole="button"
        disabled={isSearching}
        onPress={onSearch}
        style={({ pressed }) => [
          styles.searchButton,
          isSearching && styles.searchButtonDisabled,
          pressed && !isSearching && styles.searchButtonPressed,
        ]}
      >
        {isSearching ? (
          <ActivityIndicator color="#FFFFFF" />
        ) : (
          <>
            <Search color={colors.surface} size={20} />
            <Text style={styles.searchButtonText}>Search Cars</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function RentalDate({
  date,
  label,
  onDatePress,
  onTimePress,
  time,
}: {
  date: string;
  label: string;
  onDatePress: () => void;
  onTimePress: () => void;
  time: string;
}) {
  return (
    <View style={styles.dateBlock}>
      <View style={styles.dateHeading}>
        <View style={styles.calendarIcon}>
          <CalendarDays color={colors.brand} size={20} />
        </View>
        <Text style={styles.dateLabel}>{label}</Text>
      </View>
      <Pressable accessibilityRole="button" onPress={onDatePress}>
        <Text numberOfLines={1} style={styles.dateValue}>{date}</Text>
      </Pressable>
      <Pressable accessibilityRole="button" onPress={onTimePress}>
        <Text style={styles.timeValue}>{time}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 14,
  },
  locationField: {
    minHeight: 58,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderRadius: radii.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 16,
    ...shadows.card,
  },
  pressed: {
    opacity: 0.76,
  },
  locationText: {
    flex: 1,
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  rentalCard: {
    overflow: 'hidden',
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: colors.brandBorder,
    backgroundColor: colors.surface,
    ...shadows.card,
  },
  dateRow: {
    minHeight: 140,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 14,
    paddingVertical: 18,
  },
  dateBlock: {
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  dateHeading: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  calendarIcon: {
    height: 36,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 18,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    backgroundColor: colors.brandSoft,
  },
  dateLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  dateValue: {
    color: colors.ink,
    fontSize: 15,
    fontWeight: '900',
  },
  timeValue: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '600',
  },
  swapColumn: {
    width: 46,
    alignItems: 'center',
  },
  swapLine: {
    flex: 1,
    width: 1,
    backgroundColor: colors.brandSoft,
  },
  swapButton: {
    height: 38,
    width: 38,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 19,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  durationRow: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderTopWidth: 1,
    borderTopColor: colors.brandSoft,
    marginHorizontal: 14,
  },
  durationLabel: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
  },
  durationValue: {
    flex: 1,
    color: colors.brand,
    fontSize: 13,
    fontWeight: '900',
  },
  searchButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: radii.md,
    backgroundColor: colors.brand,
    ...shadows.card,
  },
  validationError: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '700',
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonPressed: {
    backgroundColor: colors.brandPressed,
  },
  searchButtonText: {
    color: colors.surface,
    fontSize: 16,
    fontWeight: '900',
  },
});
