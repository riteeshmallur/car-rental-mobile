import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { HopInLogo } from '@/components/branding/hopin-logo';

export function AuthLoadingScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <HopInLogo width={156} />
        <ActivityIndicator color="#102550" size="large" />
        <Text style={styles.text}>Restoring your HopIn session</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F3F9FF',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    padding: 24,
  },
  text: {
    color: '#536B91',
    fontSize: 15,
    fontWeight: '700',
  },
});
