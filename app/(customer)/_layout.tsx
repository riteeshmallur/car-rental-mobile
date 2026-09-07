import { Redirect, Stack } from 'expo-router';

import { AuthLoadingScreen } from '@/features/auth/screens/auth-loading-screen';
import { useAuthStore } from '@/store/auth-store';

export default function CustomerLayout() {
  const authStatus = useAuthStore((state) => state.status);

  if (authStatus === 'bootstrapping') {
    return <AuthLoadingScreen />;
  }

  if (authStatus === 'unauthenticated') {
    return <Redirect href="/(auth)/login" />;
  }

  return <Stack screenOptions={{ headerShown: false }} />;
}
