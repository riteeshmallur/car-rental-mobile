import { useEffect, useRef } from 'react';
import { Platform } from 'react-native';

type WebBackGuardOptions = {
  active: boolean;
  block?: boolean;
  onBack: () => void;
  pushEntry?: boolean;
};

const historyMarkerKey = '__hopinBackGuard';

export function useWebBackGuard({
  active,
  block = false,
  onBack,
  pushEntry = true,
}: WebBackGuardOptions) {
  const markerRef = useRef<string | null>(null);
  const onBackRef = useRef(onBack);
  onBackRef.current = onBack;

  useEffect(() => {
    if (Platform.OS !== 'web' || !active || typeof window === 'undefined') {
      return;
    }

    const marker = `overlay-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    markerRef.current = marker;

    const pushGuardEntry = () => {
      const currentState = window.history.state;
      const nextState =
        currentState && typeof currentState === 'object'
          ? { ...currentState, [historyMarkerKey]: marker }
          : { [historyMarkerKey]: marker };

      window.history.pushState(nextState, '', window.location.href);
    };

    if (pushEntry) {
      pushGuardEntry();
    }

    const handlePopState = () => {
      onBackRef.current();

      if (block) {
        pushGuardEntry();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);

      if (
        pushEntry &&
        window.history.state?.[historyMarkerKey] === markerRef.current
      ) {
        window.history.back();
      }

      markerRef.current = null;
    };
  }, [active, block, pushEntry]);
}
