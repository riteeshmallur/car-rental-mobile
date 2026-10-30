import { router } from 'expo-router';
import {
  ArrowLeft,
  Bell,
  ChevronRight,
  CreditCard,
  ShieldCheck,
  UserRound,
} from 'lucide-react-native';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSafeBack } from '@/hooks/use-safe-back';
import { colors, radii } from '@/utils/theme';

type SettingsScreenProps = {
  mode: 'customer' | 'host';
};

type SettingItem = {
  description: string;
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
};

export function SettingsScreen({ mode }: SettingsScreenProps) {
  const fallback = mode === 'host' ? '/(host)/profile' : '/(customer)/profile';
  const goBack = useSafeBack({ fallback });
  const personalInformationRoute = mode === 'host'
    ? '/(host)/personal-information'
    : '/(customer)/personal-information';

  const settings: SettingItem[] = [
    {
      label: 'Personal information',
      description: 'Update your name, email and mobile number',
      icon: <UserRound color={colors.brand} size={20} />,
      onPress: () => router.push(personalInformationRoute),
    },
    {
      label: 'Notifications',
      description: 'View account and trip updates',
      icon: <Bell color={colors.brand} size={20} />,
      onPress: () => router.push('/(customer)/notifications'),
    },
    {
      label: 'Payment methods',
      description: 'Manage cards and payment preferences',
      icon: <CreditCard color={colors.brand} size={20} />,
      onPress: () => router.push('/(customer)/payment-methods'),
    },
    {
      label: 'Privacy & security',
      description: 'Manage data, account export and deletion',
      icon: <ShieldCheck color={colors.brand} size={20} />,
      onPress: () => router.push('/(customer)/privacy-security'),
    },
  ];

  return (
    <SafeAreaView edges={['top', 'bottom']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={goBack}
            style={({ pressed }) => [styles.backButton, pressed && styles.pressed]}
          >
            <ArrowLeft color={colors.ink} size={22} />
          </Pressable>
          <View style={styles.headerCopy}>
            <Text accessibilityRole="header" style={styles.title}>Settings</Text>
            <Text style={styles.subtitle}>Manage your account preferences</Text>
          </View>
        </View>

        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.intro}>
            These settings apply to the same HopIn account in customer and host mode.
          </Text>
          <View style={styles.list}>
            {settings.map((item) => (
              <Pressable
                accessibilityHint={item.description}
                accessibilityLabel={item.label}
                accessibilityRole="button"
                key={item.label}
                onPress={item.onPress}
                style={({ pressed }) => [styles.row, pressed && styles.pressed]}
              >
                <View style={styles.icon}>{item.icon}</View>
                <View style={styles.rowCopy}>
                  <Text style={styles.rowTitle}>{item.label}</Text>
                  <Text style={styles.rowDescription}>{item.description}</Text>
                </View>
                <ChevronRight color={colors.muted} size={20} />
              </Pressable>
            ))}
          </View>
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { backgroundColor: colors.background, flex: 1 },
  screen: { flex: 1 },
  header: { alignItems: 'center', flexDirection: 'row', gap: 12, minHeight: 76, paddingHorizontal: 16 },
  backButton: { alignItems: 'center', backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.md, borderWidth: 1, height: 44, justifyContent: 'center', width: 44 },
  headerCopy: { flex: 1, minWidth: 0 },
  title: { color: colors.ink, fontSize: 24, fontWeight: '900' },
  subtitle: { color: colors.muted, fontSize: 13, fontWeight: '600', marginTop: 2 },
  content: { gap: 14, padding: 16, paddingBottom: 32 },
  intro: { color: colors.muted, fontSize: 13, fontWeight: '600', lineHeight: 20 },
  list: { backgroundColor: colors.surface, borderColor: colors.border, borderRadius: radii.lg, borderWidth: 1, overflow: 'hidden' },
  row: { alignItems: 'center', borderBottomColor: colors.border, borderBottomWidth: 1, flexDirection: 'row', gap: 12, minHeight: 72, paddingHorizontal: 14, paddingVertical: 12 },
  icon: { alignItems: 'center', backgroundColor: colors.surfaceMuted, borderRadius: 12, height: 42, justifyContent: 'center', width: 42 },
  rowCopy: { flex: 1, minWidth: 0 },
  rowTitle: { color: colors.ink, fontSize: 16, fontWeight: '800' },
  rowDescription: { color: colors.muted, fontSize: 12, fontWeight: '600', lineHeight: 18, marginTop: 2 },
  pressed: { opacity: 0.8 },
});
