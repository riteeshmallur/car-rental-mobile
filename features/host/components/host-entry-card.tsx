import { ArrowRight, CarFront } from 'lucide-react-native';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { type HostEntryCopy } from '@/features/host/utils/host-entry';
import { colors, radii } from '@/utils/theme';

export function HostEntryCard({
  copy,
  isLoading = false,
  onPress,
}: {
  copy?: HostEntryCopy;
  isLoading?: boolean;
  onPress?: () => void;
}) {
  if (isLoading || !copy) {
    return (
      <View accessibilityLabel="Loading host options" style={styles.card}>
        <View style={styles.icon}><CarFront color={colors.ink} size={24} /></View>
        <View style={styles.copy}>
          <Text style={styles.title}>Host with HopIn</Text>
          <Text style={styles.body}>Checking your host account status.</Text>
        </View>
        <ActivityIndicator color={colors.brand} />
      </View>
    );
  }

  return (
    <Pressable
      accessibilityHint={copy.body}
      accessibilityLabel={`${copy.title}. ${copy.cta}`}
      accessibilityRole="button"
      onPress={onPress}
      style={({ pressed }) => [styles.card, pressed && styles.pressed]}
    >
      <View style={styles.icon}><CarFront color={colors.ink} size={24} /></View>
      <View style={styles.copy}>
        <Text style={styles.title}>{copy.title}</Text>
        <Text style={styles.body}>{copy.body}</Text>
        <View style={styles.cta}>
          <Text style={styles.ctaText}>{copy.cta}</Text>
          <ArrowRight color={colors.surface} size={16} />
        </View>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    minHeight: 118,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    overflow: 'hidden',
    borderRadius: radii.lg,
    backgroundColor: colors.brandSoft,
    padding: 14,
  },
  icon: {
    height: 48,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radii.md,
    backgroundColor: colors.surface,
  },
  copy: {
    minWidth: 0,
    flex: 1,
  },
  title: {
    color: colors.ink,
    fontSize: 17,
    fontWeight: '900',
  },
  body: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
    marginTop: 2,
  },
  cta: {
    minHeight: 36,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: radii.sm,
    backgroundColor: colors.brand,
    marginTop: 9,
    paddingHorizontal: 12,
  },
  ctaText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '900',
  },
  pressed: {
    opacity: 0.76,
  },
});
