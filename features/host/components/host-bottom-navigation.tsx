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
    <View
      accessibilityRole="tablist"
      style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) }]}
      testID="host-bottom-navigation"
    >
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
            <Icon color={isActive ? colors.brand : colors.muted} size={20} />
            <Text numberOfLines={1} style={[styles.label, isActive && styles.labelActive]}>
              {item.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderTopColor: colors.border,
    borderTopWidth: 1,
    flexDirection: 'row',
    flexShrink: 0,
    justifyContent: 'space-around',
    minHeight: 74,
    paddingHorizontal: 4,
    paddingTop: 8,
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
    fontSize: 10,
    fontWeight: '800',
    textAlign: 'center',
  },
  labelActive: {
    color: colors.brand,
  },
});
