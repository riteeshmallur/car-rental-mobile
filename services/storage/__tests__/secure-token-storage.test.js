const mockValues = new Map();

jest.mock('expo-secure-store', () => ({
  deleteItemAsync: jest.fn((key) => {
    mockValues.delete(key);
    return Promise.resolve();
  }),
  getItemAsync: jest.fn((key) => Promise.resolve(mockValues.get(key) ?? null)),
  setItemAsync: jest.fn((key, value) => {
    mockValues.set(key, value);
    return Promise.resolve();
  }),
}));

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));

const SecureStore = require('expo-secure-store');
const { Platform } = require('react-native');
const {
  clearStoredAuthTokens,
  getStoredAuthTokens,
  setStoredAuthTokens,
} = require('../secure-token-storage');

describe('secure token storage', () => {
  beforeEach(async () => {
    Platform.OS = 'ios';
    mockValues.clear();
    jest.clearAllMocks();
    await clearStoredAuthTokens();
  });

  it('persists both native tokens with SecureStore and restores them', async () => {
    await setStoredAuthTokens({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });

    await expect(getStoredAuthTokens()).resolves.toEqual({
      accessToken: 'access-token',
      refreshToken: 'refresh-token',
    });
    expect(SecureStore.setItemAsync).toHaveBeenCalledTimes(2);
  });

  it('cleans up partial native credentials instead of restoring a broken session', async () => {
    mockValues.set('hopin.accessToken', 'access-token');

    await expect(getStoredAuthTokens()).resolves.toBeNull();
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('hopin.accessToken');
    expect(SecureStore.deleteItemAsync).toHaveBeenCalledWith('hopin.refreshToken');
  });

  it('keeps web access tokens in memory without using SecureStore or localStorage', async () => {
    Platform.OS = 'web';

    await setStoredAuthTokens({ accessToken: 'browser-access' });

    await expect(getStoredAuthTokens()).resolves.toEqual({
      accessToken: 'browser-access',
    });
    expect(SecureStore.setItemAsync).not.toHaveBeenCalled();

    await clearStoredAuthTokens();
    await expect(getStoredAuthTokens()).resolves.toBeNull();
  });
});
