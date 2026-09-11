import { Redirect, Stack } from 'expo-router';

import { AuthLoadingScreen } from '@/features/auth/screens/auth-loading-screen';
import { useAuthStore } from '@/store/auth-store';
import { UserRole } from '@/types/auth';

export default function HostLayout() {
  const authStatus = useAuthStore((state) => state.status);
  const user = useAuthStore((state) => state.user);

  if (authStatus === 'bootstrapping') {
    return <AuthLoadingScreen />;
  }

  if (authStatus === 'unauthenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  const canHost = Boolean(
    user?.capabilities.canHost ||
      user?.hostEnabled ||
      user?.role === UserRole.Host ||
      user?.role === UserRole.Admin,
  );

  if (!canHost) {
    return <Redirect href="/(customer)/become-host" />;
  }

  return (
    <Stack screenOptions={{ headerShown: false }}>
      <Stack.Screen name="vehicles/new" options={{ gestureEnabled: false }} />
    </Stack>
  );
}
