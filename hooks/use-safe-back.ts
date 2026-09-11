import { type Href, router, useFocusEffect, useNavigation } from 'expo-router';
import { useCallback, useRef } from 'react';
import { BackHandler } from 'react-native';

import { useErrorStore } from '@/store/error-store';
import { useLoadingStore } from '@/store/loading-store';

type SafeBackOptions = {
  fallback?: Href;
  onBeforeBack?: () => boolean | void;
  preferFallback?: boolean;
};

const backLockDurationMs = 450;
const removalActions = new Set(['GO_BACK', 'POP']);
let backLockedUntil = 0;

export function useSafeBack({
  fallback,
  onBeforeBack,
  preferFallback = false,
}: SafeBackOptions = {}) {
  const navigation = useNavigation();
  const allowNextRemovalRef = useRef(false);

  const goBack = useCallback(() => {
    const now = Date.now();

    if (now < backLockedUntil) {
      return true;
    }

    backLockedUntil = now + backLockDurationMs;

    if (useLoadingStore.getState().isLoading) {
      return true;
    }

    const errorStore = useErrorStore.getState();

    if (errorStore.currentError) {
      errorStore.clearError();
      return true;
    }

    if (onBeforeBack?.()) {
      return true;
    }

    if (!preferFallback && router.canGoBack()) {
      allowNextRemovalRef.current = true;
      router.back();
      return true;
    }

    if (fallback) {
      router.replace(fallback);
      return true;
    }

    backLockedUntil = 0;
    return false;
  }, [fallback, onBeforeBack, preferFallback]);

  useFocusEffect(
    useCallback(() => {
      const hardwareSubscription = BackHandler.addEventListener(
        'hardwareBackPress',
        goBack,
      );
      const navigationSubscription = navigation.addListener(
        'beforeRemove',
        (event) => {
          if (!removalActions.has(event.data.action.type)) {
            return;
          }

          if (allowNextRemovalRef.current) {
            allowNextRemovalRef.current = false;
            return;
          }

          event.preventDefault();
          goBack();
        },
      );

      return () => {
        hardwareSubscription.remove();
        navigationSubscription();
      };
    }, [goBack, navigation]),
  );

  return goBack;
}
