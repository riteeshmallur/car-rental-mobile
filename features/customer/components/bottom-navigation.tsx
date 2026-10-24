import {
  Briefcase,
  Heart,
  Home,
  Menu,
  type LucideIcon,
} from 'lucide-react-native';
import { type Href, router, usePathname } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { shadows } from '@/utils/theme';

type NavItem = {
  href: Href;
  path: string;
  icon: LucideIcon;
  label: string;
};

const navItems: NavItem[] = [
  { href: '/(customer)/home', path: '/home', icon: Home, label: 'Home' },
  { href: '/(customer)/trips', path: '/trips', icon: Briefcase, label: 'My Bookings' },
  { href: '/(customer)/favorites', path: '/favorites', icon: Heart, label: 'Favourites' },
  { href: '/(customer)/profile', path: '/profile', icon: Menu, label: 'More' },
];

export function BottomNavigation() {
  const pathname = usePathname();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.shell, { paddingBottom: Math.max(insets.bottom, 10) }]}>
      <View style={styles.container}>
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
              style={({ pressed }) => [
                styles.item,
                isActive && styles.itemActive,
                pressed && styles.itemPressed,
              ]}
            >
              <Icon
                color={isActive ? HOME_BLUE : HOME_MUTED}
                fill={isActive && item.label === 'Home' ? HOME_BLUE : 'transparent'}
                size={22}
              />
              <Text style={[styles.label, isActive && styles.labelActive]}>
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const HOME_BLUE = '#0B6FE8';
const HOME_MUTED = '#536B91';

const styles = StyleSheet.create({
  shell: {
    flexShrink: 0,
    alignItems: 'center',
    backgroundColor: '#F3F9FF',
    paddingTop: 8,
    paddingHorizontal: 18,
  },
  container: {
    width: '100%',
    maxWidth: 560,
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    borderWidth: 1,
    borderColor: '#D6E8FF',
    borderRadius: 28,
    backgroundColor: '#FFFFFF',
    paddingVertical: 7,
    paddingHorizontal: 8,
    ...shadows.floating,
  },
  item: {
    flex: 1,
    minHeight: 52,
    minWidth: 0,
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
    textAlign: 'center',
    color: HOME_MUTED,
    fontSize: 11,
    fontWeight: '800',
  },
  labelActive: {
    color: HOME_BLUE,
  },
});
