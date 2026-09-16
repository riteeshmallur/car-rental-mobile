import {
  Briefcase,
  Heart,
  Home,
  Search,
  UserRound,
  type LucideIcon,
} from 'lucide-react-native';
import { type Href, router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, shadows } from '@/utils/theme';

type NavItem = {
  href: Href;
  path: string;
  icon: LucideIcon;
  label: string;
};

const navItems: NavItem[] = [
  { href: '/(customer)/home', path: '/home', icon: Home, label: 'Home' },
  { href: '/(customer)/search', path: '/search', icon: Search, label: 'Search' },
  { href: '/(customer)/trips', path: '/trips', icon: Briefcase, label: 'Trips' },
  { href: '/(customer)/favorites', path: '/favorites', icon: Heart, label: 'Favorites' },
  { href: '/(customer)/profile', path: '/profile', icon: UserRound, label: 'Profile' },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.container, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      {navItems.map((item) => {
        const isActive = pathname === item.path;
        const Icon = item.icon;

        return (
          <Pressable
            accessibilityRole="button"
            key={item.path}
            onPress={() => router.replace(item.href)}
            style={({ pressed }) => [
              styles.item,
              isActive && styles.itemActive,
              pressed && styles.itemPressed,
            ]}
          >
            <Icon
              color={isActive ? colors.brand : colors.muted}
              fill={isActive && item.label === 'Home' ? colors.brand : 'transparent'}
              size={21}
            />
            <Text style={[styles.label, isActive && styles.labelActive]}>
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
    position: 'absolute',
    right: 0,
    bottom: 0,
    left: 0,
    minHeight: 74,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingTop: 8,
    paddingHorizontal: 8,
    ...shadows.floating,
  },
  item: {
    minHeight: 52,
    minWidth: 58,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    borderRadius: 8,
  },
  itemActive: {},
  itemPressed: {
    opacity: 0.76,
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '800',
  },
  labelActive: {
    color: colors.brand,
  },
});
