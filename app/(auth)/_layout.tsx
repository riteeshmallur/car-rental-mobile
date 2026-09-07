import { Redirect, Stack } from 'expo-router';

import { AuthLoadingScreen } from '@/features/auth/screens/auth-loading-screen';
import { useAuthStore } from '@/store/auth-store';

export default function AuthLayout() {
  const authStatus = useAuthStore((state) => state.status);

  if (authStatus === 'bootstrapping') {
    return <AuthLoadingScreen />;
  }

  if (authStatus === 'authenticated') {
    return <Redirect href="/(customer)/home" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
