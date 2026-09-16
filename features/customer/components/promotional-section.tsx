import { ChevronRight, ShieldCheck } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { colors, radii } from '@/utils/theme';

export function PromotionalSection() {
  return (
    <View style={styles.section}>
      <View style={styles.iconWrap}>
        <ShieldCheck color={colors.surface} size={29} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Drive with confidence</Text>
        <Text style={styles.body}>
          Every car is verified for a safer HopIn journey.
        </Text>
      </View>
      <Pressable accessibilityLabel="Learn more" accessibilityRole="button" style={styles.cta}>
        <ChevronRight color={colors.text} size={22} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 13,
    borderRadius: radii.lg,
    borderWidth: 1,
    borderColor: colors.brandBorder,
    backgroundColor: colors.brandSoft,
    padding: 16,
  },
  iconWrap: {
    height: 48,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 24,
    backgroundColor: colors.brand,
  },
  copy: {
    flex: 1,
    gap: 6,
  },
  title: {
    color: colors.ink,
    fontSize: 16,
    fontWeight: '900',
  },
  body: {
    color: colors.text,
    fontSize: 13,
    lineHeight: 19,
    fontWeight: '600',
  },
  cta: {
    height: 42,
    width: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
