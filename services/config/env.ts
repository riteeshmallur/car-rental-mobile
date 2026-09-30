import { Platform } from 'react-native';

const fallbackApiUrl = 'http://LOCAL_IP:3001/api/v1';
const browserFallbackApiUrl = 'http://localhost:3099/api/v1';

function normalizeBaseUrl(url: string) {
  return url.trim().replace(/\/+$/, '');
}

const configuredApiUrl =
  Platform.OS === 'web'
    ? process.env.EXPO_PUBLIC_WEB_API_URL ||
      process.env.EXPO_PUBLIC_API_URL ||
      browserFallbackApiUrl
    : process.env.EXPO_PUBLIC_API_URL || fallbackApiUrl;

const apiUrl = normalizeBaseUrl(configuredApiUrl);

if (__DEV__ && Platform.OS !== 'web' && /(localhost|127\.0\.0\.1)/i.test(apiUrl)) {
  console.warn(
    'EXPO_PUBLIC_API_URL should use your LAN IP address for physical-device testing.',
  );
}

export const env = {
  apiUrl,
};
