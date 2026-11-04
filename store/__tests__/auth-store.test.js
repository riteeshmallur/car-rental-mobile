const mockGetStoredAuthTokens = jest.fn();
const mockClearStoredAuthTokens = jest.fn();
const mockSetStoredAuthTokens = jest.fn();
const mockAuthMe = jest.fn();
const mockAuthRefresh = jest.fn();
const mockQueryClientClear = jest.fn();
const mockClearError = jest.fn();
const mockStartLoading = jest.fn();
const mockStopLoading = jest.fn();

jest.mock('react-native', () => ({
  Platform: { OS: 'ios' },
}));
jest.mock('@/services/storage/secure-token-storage', () => ({
  clearStoredAuthTokens: mockClearStoredAuthTokens,
  getStoredAuthTokens: mockGetStoredAuthTokens,
  setStoredAuthTokens: mockSetStoredAuthTokens,
}));
jest.mock('@/features/auth/services/auth-api', () => ({
  authApi: { me: mockAuthMe, refresh: mockAuthRefresh },
}));
jest.mock('@/utils/query-client', () => ({
  queryClient: { clear: mockQueryClientClear },
}));
jest.mock('@/store/error-store', () => ({
  useErrorStore: { getState: () => ({ clearError: mockClearError }) },
}));
jest.mock('@/store/loading-store', () => ({
  useLoadingStore: {
    getState: () => ({
      startLoading: mockStartLoading,
      stopLoading: mockStopLoading,
    }),
  },
}));

const { useAuthStore } = require('../auth-store');
const { Platform } = require('react-native');

const user = {
  id: 'user-1',
  firstName: 'Riteesh',
  lastName: null,
};

describe('auth session restoration', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    Platform.OS = 'ios';
    useAuthStore.setState({
      isAuthenticated: false,
      status: 'unauthenticated',
      tokens: null,
      user: null,
    });
  });

  it('restores a native session from SecureStore tokens', async () => {
    const tokens = { accessToken: 'access-token', refreshToken: 'refresh-token' };
    mockGetStoredAuthTokens.mockResolvedValue(tokens);
    mockAuthRefresh.mockResolvedValue({
      accessToken: 'rotated-access-token',
      refreshToken: 'rotated-refresh-token',
      user,
    });

    await useAuthStore.getState().bootstrap();

    expect(mockAuthRefresh).toHaveBeenCalledWith('refresh-token', {
      suppressGlobalError: true,
    });
    expect(useAuthStore.getState()).toMatchObject({
      isAuthenticated: true,
      status: 'authenticated',
      tokens: { accessToken: 'rotated-access-token', refreshToken: 'rotated-refresh-token' },
      user,
    });
  });

  it('cleans up an expired session when validation fails', async () => {
    mockGetStoredAuthTokens.mockResolvedValue({
      accessToken: 'expired-access',
      refreshToken: 'expired-refresh',
    });
    mockAuthRefresh.mockRejectedValue(new Error('SESSION_EXPIRED'));

    await useAuthStore.getState().bootstrap();

    expect(mockClearStoredAuthTokens).toHaveBeenCalledTimes(1);
    expect(mockQueryClientClear).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({
      isAuthenticated: false,
      status: 'unauthenticated',
      tokens: null,
      user: null,
    });
  });

  it('restores a browser cookie session without a persisted refresh token', async () => {
    Platform.OS = 'web';
    const refreshedUser = { ...user, firstName: 'Current account' };
    mockGetStoredAuthTokens
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ accessToken: 'cookie-restored-access' });
    mockAuthRefresh.mockResolvedValue({
      accessToken: 'cookie-restored-access',
      refreshToken: undefined,
      user,
    });
    mockAuthMe.mockResolvedValue(refreshedUser);

    await useAuthStore.getState().bootstrap();

    expect(mockAuthMe).toHaveBeenCalledWith({ suppressGlobalError: true });
    expect(mockAuthRefresh).toHaveBeenCalledWith(undefined, { suppressGlobalError: true });
    expect(useAuthStore.getState()).toMatchObject({
      isAuthenticated: true,
      status: 'authenticated',
      tokens: { accessToken: 'cookie-restored-access' },
      user: refreshedUser,
    });
  });

  it('clears browser auth state when the refresh cookie session has expired', async () => {
    Platform.OS = 'web';
    mockGetStoredAuthTokens.mockResolvedValue(null);
    mockAuthRefresh.mockRejectedValue(new Error('SESSION_EXPIRED'));

    await useAuthStore.getState().bootstrap();

    expect(mockAuthMe).not.toHaveBeenCalled();
    expect(mockClearStoredAuthTokens).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({
      isAuthenticated: false,
      status: 'unauthenticated',
      tokens: null,
      user: null,
    });
  });

  it('clears prior account queries before establishing a new OTP session', async () => {
    const tokens = { accessToken: 'new-access', refreshToken: 'new-refresh' };
    mockGetStoredAuthTokens.mockResolvedValue(tokens);
    mockAuthMe.mockResolvedValue(user);

    await useAuthStore.getState().setSession({ ...tokens, user });

    expect(mockQueryClientClear).toHaveBeenCalledTimes(1);
    expect(useAuthStore.getState()).toMatchObject({
      isAuthenticated: true,
      status: 'authenticated',
      tokens,
      user,
    });
  });
});
