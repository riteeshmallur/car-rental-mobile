const React = require('react');
const { act, fireEvent, render, waitFor } = require('@testing-library/react-native');

const mockUseMutation = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useMutation: (...args) => mockUseMutation(...args),
}));

jest.mock('@/features/auth/components/auth-shell', () => ({
  AuthShell: ({ children }) =>
    require('react').createElement(require('react').Fragment, null, children),
}));

jest.mock('@/hooks/use-safe-back', () => ({
  useSafeBack: () => jest.fn(),
}));

jest.mock('@/store/auth-store', () => ({
  useAuthStore: (selector) => selector({ setSession: jest.fn() }),
}));

const { OtpVerificationScreen } = require('@/features/auth/screens/otp-verification-screen');

describe('OTP verification validation', () => {
  beforeEach(() => {
    global.__testRouteParams.mockReturnValue({ countryCode: '+91', phoneNumber: '+919876543210' });
    mockUseMutation.mockReset();
    mockUseMutation.mockImplementation((options) => ({
      isPending: false,
      mutate: jest.fn(),
      reset: jest.fn(),
      ...options,
    }));
  });

  it('clears a server validation error as soon as the OTP changes', async () => {
    const screen = render(React.createElement(OtpVerificationScreen));
    const verifyMutation = mockUseMutation.mock.calls[0][0];

    await act(async () => {
      verifyMutation.onError(new Error('Invalid OTP'));
    });

    expect(screen.getAllByText('Invalid OTP').length).toBeGreaterThan(0);

    fireEvent.changeText(screen.getByLabelText('One-time password'), '123456');

    await waitFor(() => {
      expect(screen.queryByText('Invalid OTP')).toBeNull();
    });
  });
});
