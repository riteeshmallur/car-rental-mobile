import { router } from 'expo-router';
import {
  ArrowLeft,
  ExternalLink,
  FileText,
  Mail,
  MessageCircleQuestion,
  Phone,
} from 'lucide-react-native';
import { Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSafeBack } from '@/hooks/use-safe-back';
import { colors, radii } from '@/utils/theme';

async function openUrl(url: string) {
  const supported = await Linking.canOpenURL(url);

  if (supported) {
    await Linking.openURL(url);
  }
}

export function HelpSupportScreen() {
  const goBack = useSafeBack({ fallback: '/(customer)/profile' });

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.screen}>
        <View style={styles.header}>
          <Pressable
            accessibilityLabel="Go back"
            accessibilityRole="button"
            onPress={goBack}
            style={styles.iconButton}
          >
            <ArrowLeft color={colors.ink} size={21} />
          </Pressable>
          <View>
            <Text style={styles.eyebrow}>Support</Text>
            <Text style={styles.title}>Help & support</Text>
          </View>
        </View>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <View style={styles.hero}>
            <MessageCircleQuestion color={colors.brand} size={29} />
            <Text style={styles.heroTitle}>How can we help?</Text>
            <Text style={styles.heroBody}>
              For booking or account support, contact our team through your preferred channel.
            </Text>
          </View>
          <SupportRow
            icon={<Mail color={colors.brand} size={21} />}
            label="Email support"
            onPress={() => void openUrl('mailto:support@hopin.app')}
            value="support@hopin.app"
          />
          <SupportRow
            icon={<Phone color={colors.brand} size={21} />}
            label="Call support"
            onPress={() => void openUrl('tel:+918000000000')}
            value="+91 80000 00000"
          />
          <Text style={styles.sectionTitle}>Policies</Text>
          <SupportRow
            icon={<FileText color={colors.brand} size={21} />}
            label="Terms of service"
            onPress={() => router.push({ pathname: '/(customer)/policy', params: { type: 'terms' } } as never)}
            value="Read the rental terms"
          />
          <SupportRow
            icon={<FileText color={colors.brand} size={21} />}
            label="Privacy policy"
            onPress={() => router.push({ pathname: '/(customer)/policy', params: { type: 'privacy' } } as never)}
            value="How HopIn handles your data"
          />
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

function SupportRow({
  icon,
  label,
  onPress,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  onPress: () => void;
  value: string;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <View style={styles.rowIcon}>{icon}</View>
      <View style={styles.rowCopy}>
        <Text style={styles.rowTitle}>{label}</Text>
        <Text style={styles.rowValue}>{value}</Text>
      </View>
      <ExternalLink color={colors.muted} size={18} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: colors.background },
  screen: { flex: 1 },
  header: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 16,
  },
  iconButton: {
    height: 44,
    width: 44,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  eyebrow: { color: colors.muted, fontSize: 11, fontWeight: '900', textTransform: 'uppercase' },
  title: { color: colors.ink, fontSize: 23, fontWeight: '900' },
  content: { gap: 12, padding: 16, paddingBottom: 32 },
  hero: {
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    borderRadius: radii.lg,
    backgroundColor: colors.brandSoft,
    padding: 20,
  },
  heroTitle: { color: colors.ink, fontSize: 21, fontWeight: '900' },
  heroBody: { color: colors.text, fontSize: 13, fontWeight: '600', lineHeight: 20, textAlign: 'center' },
  sectionTitle: { color: colors.ink, fontSize: 17, fontWeight: '900', marginTop: 6 },
  row: {
    minHeight: 76,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 14,
    backgroundColor: colors.surface,
    padding: 13,
  },
  rowIcon: {
    height: 42,
    width: 42,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: colors.brandSoft,
  },
  rowCopy: { minWidth: 0, flex: 1 },
  rowTitle: { color: colors.ink, fontSize: 15, fontWeight: '900' },
  rowValue: { color: colors.muted, fontSize: 12, fontWeight: '600', marginTop: 2 },
  pressed: { opacity: 0.75 },
});
