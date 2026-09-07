import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

export function AuthLoadingScreen() {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View style={styles.logoMark}>
          <Text style={styles.logoText}>H</Text>
        </View>
        <ActivityIndicator color="#111827" size="large" />
        <Text style={styles.text}>Restoring your HopIn session</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 18,
    padding: 24,
  },
  logoMark: {
    height: 64,
    width: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    backgroundColor: '#111827',
  },
  logoText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '900',
  },
  text: {
    color: '#4B5563',
    fontSize: 15,
    fontWeight: '700',
  },
});
