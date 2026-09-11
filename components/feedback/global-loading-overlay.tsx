import { useEffect } from 'react';
import { ActivityIndicator, BackHandler, StyleSheet, View } from 'react-native';

import { useLoadingStore } from '@/store/loading-store';
import { useWebBackGuard } from '@/hooks/use-web-back-guard';

export function GlobalLoadingOverlay() {
  const isLoading = useLoadingStore((state) => state.isLoading);
  useWebBackGuard({ active: isLoading, block: true, onBack: () => undefined });

  useEffect(() => {
    if (!isLoading) {
      return;
    }

    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => true,
    );

    return () => subscription.remove();
  }, [isLoading]);

  if (!isLoading) {
    return null;
  }

  return (
    <View style={styles.overlay}>
      <ActivityIndicator color="#FFFFFF" size="large" />
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(17,24,39,0.42)',
  },
});
