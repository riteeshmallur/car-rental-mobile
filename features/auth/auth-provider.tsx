import { type PropsWithChildren, useEffect, useRef } from 'react';

import { useAuthStore } from '@/store/auth-store';

export function AuthProvider({ children }: PropsWithChildren) {
  const bootstrap = useAuthStore((state) => state.bootstrap);
  const didBootstrapRef = useRef(false);

  useEffect(() => {
    if (didBootstrapRef.current) {
      return;
    }

    didBootstrapRef.current = true;
    void bootstrap();
  }, [bootstrap]);

  return children;
}
