import { X } from 'lucide-react-native';
import { useEffect } from 'react';
import { BackHandler, Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { useErrorStore } from '@/store/error-store';
import { useWebBackGuard } from '@/hooks/use-web-back-guard';

export function GlobalErrorBanner() {
  const insets = useSafeAreaInsets();
  const currentError = useErrorStore((state) => state.currentError);
  const clearError = useErrorStore((state) => state.clearError);
  useWebBackGuard({ active: Boolean(currentError), onBack: clearError });

  useEffect(() => {
    if (!currentError) {
      return;
    }

    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      clearError();
      return true;
    });

    return () => subscription.remove();
  }, [clearError, currentError]);

  if (!currentError) {
    return null;
  }

  return (
    <View style={[styles.container, { top: insets.top + 12 }]}>
      <Text numberOfLines={2} style={styles.message}>
        {currentError.message}
      </Text>
      <Pressable
        accessibilityLabel="Dismiss error"
        accessibilityRole="button"
        hitSlop={8}
        onPress={clearError}
        style={styles.dismiss}
      >
        <X color="#FFFFFF" size={18} />
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 20,
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 8,
    backgroundColor: '#B91C1C',
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  message: {
    flex: 1,
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 19,
  },
  dismiss: {
    height: 32,
    width: 32,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.14)',
  },
});
