import { router } from 'expo-router';
import { ArrowLeft, CarFront, ClipboardList } from 'lucide-react-native';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useSafeBack } from '@/hooks/use-safe-back';

export function HostVehicleStartScreen() {
  const goBack = useSafeBack({ fallback: '/(host)/profile' });

  return (
    <SafeAreaView edges={['top']} style={styles.safeArea}>
      <View style={styles.header}>
        <Pressable
          accessibilityLabel="Go back"
          accessibilityRole="button"
          onPress={goBack}
          style={styles.iconButton}
        >
          <ArrowLeft color="#102550" size={22} />
        </Pressable>
        <Text style={styles.title}>Add vehicle</Text>
      </View>

      <View style={styles.content}>
        <View style={styles.heroIcon}>
          <CarFront color="#102550" size={42} />
        </View>
        <Text style={styles.heading}>Start your first listing</Text>
        <Text style={styles.body}>
          Your host profile is ready. The vehicle listing form will collect car
          details, photos, location, pricing, and availability.
        </Text>

        <View style={styles.checklist}>
          <View style={styles.checkRow}>
            <ClipboardList color="#102550" size={18} />
            <Text style={styles.checkText}>Keep RC, insurance, and car photos handy.</Text>
          </View>
          <View style={styles.checkRow}>
            <ClipboardList color="#102550" size={18} />
            <Text style={styles.checkText}>Set pickup location and rental rules.</Text>
          </View>
          <View style={styles.checkRow}>
            <ClipboardList color="#102550" size={18} />
            <Text style={styles.checkText}>Publish only after availability is correct.</Text>
          </View>
        </View>

        <Pressable
          accessibilityRole="button"
          onPress={() => router.replace('/(host)/profile')}
          style={styles.primaryButton}
        >
          <Text style={styles.primaryButtonText}>Go to host profile</Text>
        </Pressable>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F9FF',
  },
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
    borderColor: '#D6E8FF',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
  },
  title: {
    color: '#102550',
    fontSize: 24,
    fontWeight: '900',
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    gap: 18,
    padding: 24,
  },
  heroIcon: {
    height: 86,
    width: 86,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#EAF4FF',
  },
  heading: {
    color: '#102550',
    fontSize: 28,
    fontWeight: '900',
  },
  body: {
    color: '#536B91',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 23,
  },
  checklist: {
    gap: 12,
    borderWidth: 1,
    borderColor: '#D6E8FF',
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    padding: 14,
  },
  checkRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  checkText: {
    flex: 1,
    color: '#102550',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 20,
  },
  primaryButton: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#0B6FE8',
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '900',
  },
});
