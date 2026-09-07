import { ArrowRight, ShieldCheck } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';

export function PromotionalSection() {
  return (
    <View style={styles.section}>
      <View style={styles.iconWrap}>
        <ShieldCheck color="#FFFFFF" size={26} />
      </View>
      <View style={styles.copy}>
        <Text style={styles.title}>Zero-hassle rentals</Text>
        <Text style={styles.body}>
          Verified hosts, secure payments, and support for every HopIn booking.
        </Text>
      </View>
      <Pressable accessibilityRole="button" style={styles.cta}>
        <Text style={styles.ctaText}>Learn more</Text>
        <ArrowRight color="#FFFFFF" size={17} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: 14,
    borderRadius: 8,
    backgroundColor: '#0F172A',
    padding: 18,
  },
  iconWrap: {
    height: 48,
    width: 48,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#2563EB',
  },
  copy: {
    gap: 6,
  },
  title: {
    color: '#FFFFFF',
    fontSize: 22,
    fontWeight: '900',
  },
  body: {
    color: '#CBD5E1',
    fontSize: 15,
    lineHeight: 22,
    fontWeight: '600',
  },
  cta: {
    minHeight: 42,
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});
