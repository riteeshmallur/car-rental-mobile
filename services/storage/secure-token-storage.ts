import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

import { type AuthTokens } from '@/types/auth';

const accessTokenKey = 'hopin.accessToken';
const refreshTokenKey = 'hopin.refreshToken';

const webStorage = {
  getItem(key: string) {
    try {
      if (!globalThis.localStorage) {
        return null;
      }

      return globalThis.localStorage.getItem(key);
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string) {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // Web storage can be unavailable in private or restricted browser contexts.
    }
  },
  deleteItem(key: string) {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // Web storage can be unavailable in private or restricted browser contexts.
    }
  },
};

async function getItem(key: string) {
  if (Platform.OS === 'web') {
    return webStorage.getItem(key);
  }

  return SecureStore.getItemAsync(key);
}

async function setItem(key: string, value: string) {
  if (Platform.OS === 'web') {
    webStorage.setItem(key, value);
    return;
  }

  await SecureStore.setItemAsync(key, value);
}

async function deleteItem(key: string) {
  if (Platform.OS === 'web') {
    webStorage.deleteItem(key);
    return;
  }

  await SecureStore.deleteItemAsync(key);
}

export async function getStoredAuthTokens(): Promise<AuthTokens | null> {
  const [accessToken, refreshToken] = await Promise.all([
    getItem(accessTokenKey),
    getItem(refreshTokenKey),
  ]);

  if (!accessToken || !refreshToken) {
    return null;
  }

  return {
    accessToken,
    refreshToken,
  };
}

export async function setStoredAuthTokens(tokens: AuthTokens) {
  await Promise.all([
    setItem(accessTokenKey, tokens.accessToken),
    setItem(refreshTokenKey, tokens.refreshToken),
  ]);
}

export async function clearStoredAuthTokens() {
  await Promise.all([deleteItem(accessTokenKey), deleteItem(refreshTokenKey)]);
}
