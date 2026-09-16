import { ChevronDown, MapPin } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';

import { type SafeUser } from '@/types/auth';
import { type LocationSearchResult } from '@/types/location';
import { colors, radii, shadows } from '@/utils/theme';

type CustomerHeaderProps = {
  user: SafeUser | null;
  location?: LocationSearchResult | null;
  isLocationLoading?: boolean;
  onLocationPress?: () => void;
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
  onLocationPress,
  user,
}: CustomerHeaderProps) {
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}` || 'H';

  return (
    <View style={styles.container}>
      <View style={styles.brandBlock}>
        <Text numberOfLines={1} style={styles.brand}>
          HopIn
        </Text>
        <Text numberOfLines={1} style={styles.greeting}>
          Hi, {getGreetingName(user)}
        </Text>
      </View>

      <Pressable
        accessibilityLabel="Change pickup location"
        accessibilityRole="button"
        onPress={onLocationPress}
        style={({ pressed }) => [styles.locationPill, pressed && styles.pressed]}
      >
        <MapPin color={colors.brand} size={18} />
        <Text numberOfLines={1} style={styles.locationText}>
          {isLocationLoading
            ? 'Finding location'
            : location?.city || location?.name || 'Select location'}
        </Text>
        <ChevronDown color={colors.muted} size={17} />
      </Pressable>

      <View style={styles.avatar}>
        {user?.profileImageUrl ? (
          <Image source={{ uri: user.profileImageUrl }} style={styles.avatarImage} />
        ) : (
          <Text style={styles.avatarText}>{initials.toUpperCase()}</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 6,
  },
  brandBlock: {
    flex: 1,
    minWidth: 68,
    gap: 1,
  },
  brand: {
    color: colors.brand,
    fontSize: 26,
    fontWeight: '900',
  },
  greeting: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  locationPill: {
    maxWidth: 136,
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: radii.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: 10,
    ...shadows.card,
  },
  locationText: {
    flexShrink: 1,
    color: colors.ink,
    fontSize: 13,
    fontWeight: '800',
  },
  avatar: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: colors.brandSoft,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  avatarText: {
    color: colors.brand,
    fontSize: 15,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.72,
  },
});
