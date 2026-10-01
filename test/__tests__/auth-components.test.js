const React = require('react');
const { fireEvent, render } = require('@testing-library/react-native');

const { AuthSubmitButton } = require('@/features/auth/components/auth-submit-button');
const { OtpInput } = require('@/features/auth/components/otp-input');
const {
  requestOtpSchema,
  verifyOtpSchema,
} = require('@/features/auth/schemas/auth-schemas');

function OtpHarness() {
  const [value, setValue] = React.useState('');
  return React.createElement(OtpInput, { onChange: setValue, value });
}

describe('OTP login components', () => {
  it('accepts only six numeric OTP digits and exposes completion', () => {
    const screen = render(React.createElement(OtpHarness));

    fireEvent.changeText(screen.getByLabelText('One-time password'), '12a345678');

    expect(screen.getByLabelText('One-time password').props.value).toBe('123456');
    expect(screen.getByText('1')).toBeTruthy();
    expect(screen.getByText('6')).toBeTruthy();
  });

  it('keeps the submit action disabled and busy state explicit', () => {
    const screen = render(
      React.createElement(AuthSubmitButton, {
        disabled: true,
        isLoading: true,
        onPress: jest.fn(),
        title: 'Verify and continue',
      }),
    );

    const button = screen.getByLabelText('Verify and continue');
    expect(button.props.accessibilityState).toEqual({ busy: true, disabled: true });
  });

  it('validates OTP login input before it reaches the API', () => {
    expect(requestOtpSchema.safeParse({ phoneNumber: '' }).success).toBe(false);
    expect(verifyOtpSchema.safeParse({ phoneNumber: '+919876543210', otp: '123456' }).success).toBe(true);
    expect(verifyOtpSchema.safeParse({ phoneNumber: '+919876543210', otp: '12345' }).success).toBe(false);
  });
});
