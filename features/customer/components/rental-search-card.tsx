import {
  ArrowRight,
  CalendarDays,
  ChevronDown,
  MapPin,
} from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  formatDate,
  formatTime,
  type RentalWindow,
} from '@/features/customer/utils/rental-window';
import { type DateTimeField } from '@/features/customer/components/date-time-picker-sheet';
import { type LocationSearchResult } from '@/types/location';

const HOME_BLUE = '#156DF8';
const HOME_NAVY = '#0D275F';

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
  const locationName = location?.city || location?.name || 'Bengaluru';
  const locationCity = location?.city || 'Bengaluru';

  return (
    <View style={styles.container}>
      <Pressable
        accessibilityHint="Opens pickup location search."
        accessibilityLabel={location?.name ? `Pickup location, ${location.name}` : 'Select pickup location'}
        accessibilityRole="button"
        onPress={onLocationPress}
        style={({ pressed }) => [styles.locationField, pressed && styles.pressed]}
      >
        <MapPin color={HOME_BLUE} fill={HOME_BLUE} size={27} />
        <View style={styles.locationCopy}>
          <Text numberOfLines={1} style={styles.locationText}>{locationName}</Text>
          <Text numberOfLines={1} style={styles.locationHint}>
            Pick up anywhere in {locationCity}
          </Text>
        </View>
        <ChevronDown color={HOME_NAVY} size={24} />
      </Pressable>

      <View style={styles.datePanel}>
        <View style={styles.dateRow}>
          <RentalDate
            date={formatDate(rentalWindow.pickupAt)}
            label="Pick-up"
            onDatePress={() => onDateTimeFieldPress('pickupDate')}
            onTimePress={() => onDateTimeFieldPress('pickupTime')}
            time={formatTime(rentalWindow.pickupAt)}
          />

          <View accessibilityElementsHidden style={styles.dateDivider} />

          <RentalDate
            date={formatDate(rentalWindow.returnAt)}
            label="Return"
            onDatePress={() => onDateTimeFieldPress('returnDate')}
            onTimePress={() => onDateTimeFieldPress('returnTime')}
            time={formatTime(rentalWindow.returnAt)}
          />
        </View>

      </View>

      {validationError ? (
        <Text accessibilityLiveRegion="assertive" accessibilityRole="alert" style={styles.validationError}>
          {validationError}
        </Text>
      ) : null}

      <Pressable
        accessibilityLabel="Search available cars"
        accessibilityRole="button"
        accessibilityState={{ busy: Boolean(isSearching), disabled: Boolean(isSearching) }}
        disabled={isSearching}
        onPress={onSearch}
        testID="home-search-cars"
        style={({ pressed }) => [
          styles.searchButton,
          isSearching && styles.searchButtonDisabled,
          pressed && !isSearching && styles.searchButtonPressed,
        ]}
      >
        {isSearching ? (
          <ActivityIndicator accessibilityLabel="Searching available cars" color="#FFFFFF" />
        ) : (
          <>
            <Text style={styles.searchButtonText}>Search Cars</Text>
            <ArrowRight color="#FFFFFF" size={25} />
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
      <View style={styles.dateContent}>
        <View accessibilityElementsHidden style={styles.calendarIcon}>
          <CalendarDays color={HOME_BLUE} size={21} />
        </View>
        <View style={styles.dateCopy}>
          <Pressable
            accessibilityLabel={`${label} date, ${date}`}
            accessibilityRole="button"
            onPress={onDatePress}
            style={({ pressed }) => [styles.datePressable, pressed && styles.pressed]}
          >
            <Text numberOfLines={1} style={styles.dateLabel}>{label}</Text>
            <Text numberOfLines={1} style={styles.dateValue}>{date}</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={`${label} time, ${time}`}
            accessibilityRole="button"
            onPress={onTimePress}
            style={({ pressed }) => [styles.timePressable, pressed && styles.pressed]}
          >
            <Text numberOfLines={1} style={styles.timeValue}>{time}</Text>
          </Pressable>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.96)',
    padding: 8,
    shadowColor: '#72A7E8',
    shadowOffset: { height: 8, width: 0 },
    shadowOpacity: 0.16,
    shadowRadius: 18,
    elevation: 4,
  },
  locationField: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: '#CDE3FF',
    backgroundColor: '#F8FCFF',
    paddingHorizontal: 16,
  },
  pressed: {
    opacity: 0.76,
  },
  locationText: {
    flex: 1,
    color: HOME_NAVY,
    fontSize: 17,
    fontWeight: '800',
  },
  locationCopy: {
    flex: 1,
    minWidth: 0,
    gap: 3,
  },
  locationHint: {
    color: '#7182A3',
    fontSize: 12,
    fontWeight: '500',
  },
  datePanel: {
    overflow: 'hidden',
    borderRadius: 18,
    borderWidth: 1.5,
    borderColor: '#D5E8FF',
    backgroundColor: '#FFFFFF',
  },
  dateRow: {
    minHeight: 88,
    flexDirection: 'row',
    alignItems: 'stretch',
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  dateBlock: {
    minWidth: 0,
    flex: 1,
    justifyContent: 'center',
  },
  dateContent: {
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  dateCopy: {
    minWidth: 0,
    flex: 1,
  },
  datePressable: { minHeight: 42, justifyContent: 'center', gap: 1 },
  timePressable: {
    minHeight: 38,
    justifyContent: 'center',
  },
  calendarIcon: {
    height: 26,
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#EBF5FF',
  },
  dateLabel: {
    color: '#7081A2',
    fontSize: 13,
    fontWeight: '500',
  },
  dateValue: {
    color: HOME_NAVY,
    fontSize: 14,
    fontWeight: '800',
  },
  timeValue: {
    color: '#425776',
    fontSize: 13,
    fontWeight: '500',
  },
  dateDivider: {
    alignSelf: 'stretch',
    width: 1,
    marginHorizontal: 6,
    backgroundColor: '#D5E8FF',
  },
  searchButton: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 16,
    backgroundColor: HOME_BLUE,
    shadowColor: HOME_BLUE,
    shadowOffset: { height: 6, width: 0 },
    shadowOpacity: 0.24,
    shadowRadius: 10,
    elevation: 3,
  },
  validationError: {
    color: '#C6312D',
    fontSize: 13,
    fontWeight: '700',
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonPressed: {
    backgroundColor: '#095BE2',
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 17,
    fontWeight: '700',
  },
});
