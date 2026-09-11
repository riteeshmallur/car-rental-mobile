import { type PropsWithChildren, useEffect, useRef } from 'react';

import { registerApiAuthSessionHandlers } from '@/services/api/client';
import { useAuthStore } from '@/store/auth-store';

export function AuthProvider({ children }: PropsWithChildren) {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const applyRefreshedSession = useAuthStore(
    (state) => state.applyRefreshedSession,
  );
  const clearSession = useAuthStore((state) => state.clearSession);
  const didBootstrapRef = useRef(false);

  useEffect(() => {
    const unregister = registerApiAuthSessionHandlers({
      onSessionExpired: clearSession,
      onSessionRefreshed: applyRefreshedSession,
    });

    if (didBootstrapRef.current) {
      return unregister;
    }

    didBootstrapRef.current = true;
    void bootstrap();
    return unregister;
  }, [applyRefreshedSession, bootstrap, clearSession]);

  return children;
}
