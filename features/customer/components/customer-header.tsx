import { Bell, UserRound } from 'lucide-react-native';
import { Image, Pressable, StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { HopInLogo } from '@/components/branding/hopin-logo';
import { type SafeUser } from '@/types/auth';

type CustomerHeaderProps = {
  user: SafeUser | null;
  onNotificationsPress: () => void;
  onProfilePress: () => void;
};

export function CustomerHeader({
  user,
  onNotificationsPress,
  onProfilePress,
}: CustomerHeaderProps) {
  const { width: screenWidth } = useWindowDimensions();
  const initials = `${user?.firstName?.[0] ?? ''}${user?.lastName?.[0] ?? ''}` || 'H';
  // Keep the Home wordmark prominent while leaving room for the two 44px actions.
  const logoWidth = Math.max(138, Math.min(136, screenWidth * 0.44));

  return (
    <View style={styles.container}>
      <View style={styles.brandBlock}><HopInLogo width={logoWidth} /></View>

      <View style={styles.actions}>
        <Pressable
          accessibilityLabel="Open notifications"
          accessibilityRole="button"
          onPress={onNotificationsPress}
          style={({ pressed }) => [styles.notificationButton, pressed && styles.pressed]}
        >
          <Bell color={HOME_NAVY} size={22} />
        </Pressable>
        <Pressable
          accessibilityLabel="Open profile"
          accessibilityRole="button"
          onPress={onProfilePress}
          style={({ pressed }) => [styles.avatar, pressed && styles.pressed]}
        >
          {user?.profileImageUrl ? (
            <Image source={{ uri: user.profileImageUrl }} style={styles.avatarImage} />
          ) : initials === 'H' ? (
            <UserRound color="#FFFFFF" size={24} />
          ) : (
            <Text style={styles.avatarText}>{initials.toUpperCase()}</Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}

const HOME_NAVY = '#102550';
const HOME_BLUE = '#0B6FE8';

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 56,
    gap: 12,
  },
  brandBlock: {
    alignItems: 'flex-start',
    flex: 1,
    minWidth: 68,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  notificationButton: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#D6E8FF',
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.88)',
  },
  avatar: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderRadius: 22,
    backgroundColor: HOME_BLUE,
  },
  avatarImage: {
    height: '100%',
    width: '100%',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '800',
  },
  pressed: {
    opacity: 0.76,
  },
});
