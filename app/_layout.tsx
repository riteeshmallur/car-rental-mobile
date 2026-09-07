import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';

import { GlobalErrorBanner } from '@/components/feedback/global-error-banner';
import { GlobalLoadingOverlay } from '@/components/feedback/global-loading-overlay';
import { AppProviders } from '@/components/providers/app-providers';
import { useAuthStore } from '@/store/auth-store';

void SplashScreen.preventAutoHideAsync();

function RootNavigator() {
  const authStatus = useAuthStore((state) => state.status);

  useEffect(() => {
    if (authStatus !== 'bootstrapping') {
      void SplashScreen.hideAsync();
    }
  }, [authStatus]);

  return (
    <>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(customer)" />
        <Stack.Screen name="(host)" />
      </Stack>
      <GlobalErrorBanner />
      <GlobalLoadingOverlay />
      <StatusBar style="dark" />
    </>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}
