import { StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { BottomNavigation } from '@/features/customer/components/bottom-navigation';
import { useSafeBack } from '@/hooks/use-safe-back';

type CustomerPlaceholderScreenProps = {
  title: string;
};

export function CustomerPlaceholderScreen({ title }: CustomerPlaceholderScreenProps) {
  useSafeBack({ fallback: '/(customer)/home' });

  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.body}>This section is ready for the next phase.</Text>
      </View>
      <BottomNavigation />
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
    gap: 10,
    padding: 24,
    paddingBottom: 24,
  },
  title: {
    color: '#102550',
    fontSize: 28,
    fontWeight: '900',
  },
  body: {
    color: '#536B91',
    fontSize: 15,
    fontWeight: '700',
    textAlign: 'center',
  },
});
