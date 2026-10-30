import {
  Banknote,
  CalendarClock,
  CarFront,
  LayoutDashboard,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';
import { type Href, router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { colors, shadows } from '@/utils/theme';

type NavItem = {
  href: Href;
  icon: LucideIcon;
  label: string;
  path: string;
};

const navItems: NavItem[] = [
  { href: '/(host)/dashboard', icon: LayoutDashboard, label: 'Dashboard', path: '/dashboard' },
  { href: '/(host)/cars', icon: CarFront, label: 'Cars', path: '/cars' },
  { href: '/(host)/bookings', icon: CalendarClock, label: 'Bookings', path: '/bookings' },
  { href: '/(host)/earnings', icon: Banknote, label: 'Earnings', path: '/earnings' },
  { href: '/(host)/profile', icon: UserRound, label: 'Profile', path: '/profile' },
];

export function HostBottomNavigation() {
  const insets = useSafeAreaInsets();
  const pathname = usePathname();

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View accessibilityRole="tablist" style={styles.container} testID="host-bottom-navigation">
        {navItems.map((item) => {
          const isActive = pathname === item.path;
          const Icon = item.icon;

          return (
            <Pressable
              accessibilityLabel={item.label}
              accessibilityRole="tab"
              accessibilityState={{ selected: isActive }}
              key={item.path}
              onPress={() => router.replace(item.href)}
              style={({ pressed }) => [styles.item, pressed && styles.itemPressed]}
            >
              <Icon color={isActive ? colors.brand : colors.muted} size={22} />
              <Text numberOfLines={1} style={[styles.label, isActive && styles.labelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    alignItems: 'center',
    backgroundColor: colors.background,
    flexShrink: 0,
    paddingHorizontal: 18,
    paddingTop: 8,
  },
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-around',
    maxWidth: 560,
    minHeight: 76,
    paddingHorizontal: 8,
    paddingVertical: 7,
    width: '100%',
    ...shadows.floating,
  },
  item: {
    alignItems: 'center',
    borderRadius: 8,
    flex: 1,
    gap: 4,
    justifyContent: 'center',
    minHeight: 52,
    minWidth: 0,
  },
  itemPressed: {
    opacity: 0.76,
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
    textAlign: 'center',
  },
  labelActive: {
    color: colors.brand,
  },
});
