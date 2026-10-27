import { useCallback, useEffect, useRef } from 'react';
import { Platform } from 'react-native';

type WebBackGuardOptions = {
  active: boolean;
  block?: boolean;
  onBack: () => void;
  pushEntry?: boolean;
};

const historyMarkerKey = '__hopinBackGuard';
const historyGuardStackKey = '__hopinBackGuardStack';
const suppressNextPopKey = '__hopinSuppressNextBackGuardPop';

type GuardWindow = Window & {
  [historyGuardStackKey]?: string[];
  [suppressNextPopKey]?: boolean;
};

function getGuardStack() {
  const guardWindow = window as GuardWindow;
  guardWindow[historyGuardStackKey] ??= [];
  return guardWindow[historyGuardStackKey];
}

function consumeSuppressedPop() {
  const guardWindow = window as GuardWindow;

  if (!guardWindow[suppressNextPopKey]) {
    return false;
  }

  guardWindow[suppressNextPopKey] = false;
  return true;
}

export function useWebBackGuard({
  active,
  block = false,
  onBack,
  pushEntry = true,
}: WebBackGuardOptions) {
  const markerRef = useRef<string | null>(null);
  const onBackRef = useRef(onBack);
  const preserveCurrentEntryRef = useRef(false);
  onBackRef.current = onBack;

  // Route mutations made while an overlay is open replace its temporary
  // history entry. Consumers can retain that updated entry instead of having
  // cleanup navigate back to the pre-overlay URL.
  const preserveCurrentEntry = useCallback(() => {
    preserveCurrentEntryRef.current = true;
  }, []);

  useEffect(() => {
    if (Platform.OS !== 'web' || !active || typeof window === 'undefined') {
      return;
    }

    const marker = `overlay-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    markerRef.current = marker;
    const guardStack = getGuardStack();
    guardStack.push(marker);

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
      if (consumeSuppressedPop() || getGuardStack().at(-1) !== marker) {
        return;
      }

      onBackRef.current();

      if (block) {
        pushGuardEntry();
      }
    };

    window.addEventListener('popstate', handlePopState);

    return () => {
      window.removeEventListener('popstate', handlePopState);

      const markerIndex = guardStack.lastIndexOf(marker);
      if (markerIndex !== -1) {
        guardStack.splice(markerIndex, 1);
      }

      const shouldPreserveCurrentEntry = preserveCurrentEntryRef.current;
      preserveCurrentEntryRef.current = false;

      if (
        pushEntry &&
        window.history.state?.[historyMarkerKey] === markerRef.current
      ) {
        if (!shouldPreserveCurrentEntry) {
          // Closing an overlay removes its own history entry. Suppress the
          // resulting popstate so an underlying wizard/page guard does not
          // interpret it as Back.
          (window as GuardWindow)[suppressNextPopKey] = true;
          window.history.back();
        }
      }

      markerRef.current = null;
    };
  }, [active, block, pushEntry]);

  return preserveCurrentEntry;
}
