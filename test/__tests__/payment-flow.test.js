const React = require('react');
const { fireEvent, render } = require('@testing-library/react-native');

const { DevelopmentPaymentSelector } = require('@/features/customer/payment/development-payment-selector');
const {
  getPaymentScreenState,
  isConfirmedPaidBooking,
  isDevelopmentTestPaymentEnabled,
  isPendingPaymentBooking,
  shouldPollPayment,
} = require('@/features/customer/payment/payment-flow');

const booking = {
  status: 'pending_payment',
  totalPrice: '5498',
};

const payment = {
  amount: '5498',
  id: 'payment-1',
  status: 'pending',
};

describe('development payment flow', () => {
  it('keeps confirmation gated behind confirmed booking and paid payment states', () => {
    expect(isPendingPaymentBooking(booking)).toBe(true);
    expect(isConfirmedPaidBooking(booking, { ...payment, status: 'paid' })).toBe(false);
    expect(
      isConfirmedPaidBooking(
        { ...booking, status: 'confirmed' },
        { ...payment, status: 'paid' },
      ),
    ).toBe(true);
  });

  it('maps backend payment statuses to retry, processing, and cancellation states', () => {
    expect(getPaymentScreenState(booking, null)).toBe('initiate');
    expect(getPaymentScreenState(booking, { ...payment, status: 'failed' })).toBe('failed');
    expect(getPaymentScreenState(booking, { ...payment, status: 'cancelled' })).toBe('cancelled');
    expect(getPaymentScreenState(booking, { ...payment, status: 'processing' })).toBe('processing');
    expect(shouldPollPayment(booking, { ...payment, status: 'processing' })).toBe(true);
    expect(shouldPollPayment({ ...booking, status: 'confirmed' }, { ...payment, status: 'paid' })).toBe(false);
  });

  it('lets a development build select a backend payment scenario', () => {
    const onChange = jest.fn();
    const screen = render(
      React.createElement(DevelopmentPaymentSelector, {
        disabled: false,
        onChange,
        selectedScenario: 'SUCCESS',
      }),
    );

    fireEvent.press(screen.getByLabelText('Failed Payment'));

    expect(onChange).toHaveBeenCalledWith('FAILURE');
    expect(screen.getByLabelText('Successful Payment').props.accessibilityState).toEqual({
      disabled: false,
      selected: true,
    });
  });

  it('does not enable test payment controls for production builds', () => {
    expect(isDevelopmentTestPaymentEnabled({ isDevelopment: false, nodeEnvironment: 'production' })).toBe(false);
    expect(
      isDevelopmentTestPaymentEnabled({
        appEnvironment: 'test',
        enableTestPayment: 'true',
        isDevelopment: false,
        nodeEnvironment: 'production',
      }),
    ).toBe(true);
  });

  it('does not show mock payment controls when Razorpay is selected', () => {
    expect(
      isDevelopmentTestPaymentEnabled({
        isDevelopment: true,
        paymentProvider: 'razorpay',
      }),
    ).toBe(false);
  });
});
