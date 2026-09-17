import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import { colors } from '@/utils/theme';

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
    <View style={styles.frame}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(customer)" />
        <Stack.Screen name="(host)" />
      </Stack>
      <GlobalErrorBanner />
      <GlobalLoadingOverlay />
      <StatusBar style="dark" />
    </View>
  );
}

export default function RootLayout() {
  return (
    <AppProviders>
      <RootNavigator />
    </AppProviders>
  );
}

const styles = StyleSheet.create({
  frame: {
    flex: 1,
    minHeight: 0,
    width: '100%',
    maxWidth: 840,
    alignSelf: 'center',
    backgroundColor: colors.background,
  },
});
