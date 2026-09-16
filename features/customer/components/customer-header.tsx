import { Image, StyleSheet, Text, View } from 'react-native';

import { type SafeUser } from '@/types/auth';
import { colors } from '@/utils/theme';

type CustomerHeaderProps = {
  user: SafeUser | null;
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
});
