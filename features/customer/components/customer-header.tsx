import { Bell, MapPin } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type SafeUser } from '@/types/auth';
import { type LocationSearchResult } from '@/types/location';

type CustomerHeaderProps = {
  user: SafeUser | null;
  location?: LocationSearchResult | null;
  isLocationLoading?: boolean;
};

function getGreetingName(user: SafeUser | null) {
  if (user?.firstName) {
    return user.firstName;
  }

  if (user?.phoneNumber) {
    return user.phoneNumber;
  }

  return 'there';
}

export function CustomerHeader({
  isLocationLoading,
  location,
  user,
}: CustomerHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.greetingBlock}>
        <Text style={styles.eyebrow}>Good to see you</Text>
        <Text numberOfLines={1} style={styles.greeting}>
          Hi, {getGreetingName(user)}
        </Text>
        <View style={styles.locationRow}>
          <MapPin color="#2563EB" size={16} />
          <Text numberOfLines={1} style={styles.locationText}>
            {isLocationLoading
              ? 'Finding your default location'
              : location?.name || 'Bengaluru, India'}
          </Text>
        </View>
      </View>

      <Pressable accessibilityLabel="Notifications" accessibilityRole="button" style={styles.iconButton}>
        <Bell color="#111827" size={22} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 16,
  },
  greetingBlock: {
    flex: 1,
    gap: 5,
  },
  eyebrow: {
    color: '#6B7280',
    fontSize: 13,
    fontWeight: '700',
  },
  greeting: {
    color: '#111827',
    fontSize: 26,
    fontWeight: '900',
  },
  locationRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  locationText: {
    flex: 1,
    color: '#374151',
    fontSize: 14,
    fontWeight: '700',
  },
  iconButton: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
});
