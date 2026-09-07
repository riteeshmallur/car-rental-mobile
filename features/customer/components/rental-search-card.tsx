import { CalendarDays, Clock, MapPin, Search } from 'lucide-react-native';
import { type ReactNode } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import {
  formatDate,
  formatTime,
  type RentalWindow,
} from '@/features/customer/utils/rental-window';
import { type DateTimeField } from '@/features/customer/components/date-time-picker-sheet';
import { type LocationSearchResult } from '@/types/location';

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
  return (
    <View style={styles.card}>
      <Pressable
        accessibilityRole="button"
        onPress={onLocationPress}
        style={({ pressed }) => [styles.locationRow, pressed && styles.pressed]}
      >
        <MapPin color="#2563EB" size={20} />
        <View style={styles.locationCopy}>
          <Text style={styles.label}>Pickup location</Text>
          <Text numberOfLines={1} style={styles.locationText}>
            {location?.name || 'Select pickup location'}
          </Text>
        </View>
      </Pressable>

      <View style={styles.dateGrid}>
        <SearchField
          icon={<CalendarDays color="#4B5563" size={18} />}
          label="Pickup date"
          onPress={() => onDateTimeFieldPress('pickupDate')}
          value={formatDate(rentalWindow.pickupAt)}
        />
        <SearchField
          icon={<Clock color="#4B5563" size={18} />}
          label="Pickup time"
          onPress={() => onDateTimeFieldPress('pickupTime')}
          value={formatTime(rentalWindow.pickupAt)}
        />
        <SearchField
          icon={<CalendarDays color="#4B5563" size={18} />}
          label="Return date"
          onPress={() => onDateTimeFieldPress('returnDate')}
          value={formatDate(rentalWindow.returnAt)}
        />
        <SearchField
          icon={<Clock color="#4B5563" size={18} />}
          label="Return time"
          onPress={() => onDateTimeFieldPress('returnTime')}
          value={formatTime(rentalWindow.returnAt)}
        />
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
            <Search color="#FFFFFF" size={20} />
            <Text style={styles.searchButtonText}>Search Cars</Text>
          </>
        )}
      </Pressable>
    </View>
  );
}

function SearchField({
  icon,
  label,
  onPress,
  value,
}: {
  icon: ReactNode;
  label: string;
  onPress: () => void;
  value: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.field, pressed && styles.pressed]}
    >
      {icon}
      <View style={styles.fieldCopy}>
        <Text style={styles.label}>{label}</Text>
        <Text numberOfLines={1} style={styles.fieldValue}>
          {value}
        </Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    gap: 18,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    padding: 16,
  },
  locationRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  pressed: {
    opacity: 0.76,
  },
  locationCopy: {
    flex: 1,
    gap: 3,
  },
  label: {
    color: '#6B7280',
    fontSize: 12,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  locationText: {
    color: '#111827',
    fontSize: 17,
    fontWeight: '800',
  },
  dateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  field: {
    minHeight: 68,
    width: '48%',
    minWidth: 138,
    flexGrow: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    borderRadius: 8,
    backgroundColor: '#F9FAFB',
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  fieldCopy: {
    flex: 1,
    gap: 3,
  },
  fieldValue: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '800',
  },
  searchButton: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 8,
    backgroundColor: '#111827',
  },
  validationError: {
    color: '#DC2626',
    fontSize: 13,
    fontWeight: '700',
  },
  searchButtonDisabled: {
    opacity: 0.6,
  },
  searchButtonPressed: {
    opacity: 0.86,
  },
  searchButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '900',
  },
});
