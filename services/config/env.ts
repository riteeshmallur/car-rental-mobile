const fallbackApiUrl = 'http://LOCAL_IP:3001/api/v1';

function normalizeBaseUrl(url: string) {
  return url.trim().replace(/\/+$/, '');
}

const apiUrl = normalizeBaseUrl(
  process.env.EXPO_PUBLIC_API_URL || fallbackApiUrl,
);

if (__DEV__ && /(localhost|127\.0\.0\.1)/i.test(apiUrl)) {
  console.warn(
    'EXPO_PUBLIC_API_URL should use your LAN IP address for physical-device testing.',
  );
}

export const env = {
  apiUrl,
};
