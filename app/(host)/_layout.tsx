import { Redirect, Stack } from 'expo-router';

import { AuthLoadingScreen } from '@/features/auth/screens/auth-loading-screen';
import { canAccessHostMode } from '@/features/host/utils/host-mode';
import { useAuthStore } from '@/store/auth-store';

export default function HostLayout() {
  const authStatus = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  if (authStatus === 'bootstrapping') {
    return <AuthLoadingScreen />;
  }

  if (authStatus === 'unauthenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  if (!canAccessHostMode(user)) {
    return <Redirect href="/(customer)/become-host" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="vehicles/new" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
