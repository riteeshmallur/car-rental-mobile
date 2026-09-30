import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { type AuthTokens } from '@/types/auth';

const accessTokenKey = 'hopin.accessToken';
const refreshTokenKey = 'hopin.refreshToken';

// Browser access tokens deliberately live only for the lifetime of this JS context.
// The long-lived browser session is the backend-issued HttpOnly refresh cookie.
let webAccessToken: string | null = null;

export function isBrowserSession() {
  return Platform.OS === 'web';
}

export async function getStoredAuthTokens(): Promise<AuthTokens | null> {
  if (isBrowserSession()) {
    return webAccessToken ? { accessToken: webAccessToken } : null;
  }

  const [accessToken, refreshToken] = await Promise.all([
    SecureStore.getItemAsync(accessTokenKey),
    SecureStore.getItemAsync(refreshTokenKey),
  ]);

  if (accessToken && refreshToken) {
    return { accessToken, refreshToken };
  }

  // A partial credential set cannot restore a session and should not outlive it.
  if (accessToken || refreshToken) {
    await Promise.all([
      SecureStore.deleteItemAsync(accessTokenKey),
      SecureStore.deleteItemAsync(refreshTokenKey),
    ]);
  }

  return null;
}

export async function setStoredAuthTokens(tokens: AuthTokens) {
  if (isBrowserSession()) {
    webAccessToken = tokens.accessToken;
    return;
  }

  if (!tokens.refreshToken) {
    throw new Error('A refresh token is required for native sessions.');
  }

  await Promise.all([
    SecureStore.setItemAsync(accessTokenKey, tokens.accessToken),
    SecureStore.setItemAsync(refreshTokenKey, tokens.refreshToken),
  ]);
}

export async function clearStoredAuthTokens() {
  if (isBrowserSession()) {
    webAccessToken = null;
    return;
  }

  await Promise.all([
    SecureStore.deleteItemAsync(accessTokenKey),
    SecureStore.deleteItemAsync(refreshTokenKey),
  ]);
}
