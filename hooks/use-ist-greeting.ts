import { useFocusEffect } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import { AppState } from 'react-native';

import { getIstGreeting, getMillisecondsUntilNextIstGreeting } from '@/utils/ist-greeting';

/** Keeps Home's greeting aligned to IST without polling or making network requests. */
export function useIstGreeting(firstName?: string | null) {
  const createGreeting = useCallback(() => getIstGreeting(new Date(), firstName), [firstName]);
  const [greeting, setGreeting] = useState(createGreeting);

  const refresh = useCallback(() => {
    setGreeting(createGreeting());
  }, [createGreeting]);

  useFocusEffect(refresh);

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const scheduleNextBoundary = () => {
      if (timeout) clearTimeout(timeout);
      refresh();
      timeout = setTimeout(scheduleNextBoundary, getMillisecondsUntilNextIstGreeting());
    };
    const appStateSubscription = AppState.addEventListener('change', (state) => {
      if (state === 'active') {
        scheduleNextBoundary();
      }
    });

    scheduleNextBoundary();
    return () => {
      if (timeout) clearTimeout(timeout);
      appStateSubscription.remove();
    };
  }, [refresh]);

  return greeting;
}
