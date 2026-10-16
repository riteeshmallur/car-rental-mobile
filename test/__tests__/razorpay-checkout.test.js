const RazorpayCheckout = require('react-native-razorpay').default;
const { NativeModules } = require('react-native');
const {
  RazorpayCheckoutUnavailableError,
  isRazorpayCheckoutAvailable,
  openRazorpayCheckout,
} = require('@/features/customer/payment/razorpay-checkout');

describe('Razorpay native checkout bridge', () => {
  beforeEach(() => {
    RazorpayCheckout.open.mockReset();
    NativeModules.RNRazorpayCheckout = { open: jest.fn() };
  });

  afterEach(() => {
    delete NativeModules.RNRazorpayCheckout;
  });

  it('opens checkout using only backend-issued order data', async () => {
    RazorpayCheckout.open.mockResolvedValue({
      razorpay_order_id: 'order_123',
      razorpay_payment_id: 'pay_123',
      razorpay_signature: 'signature',
    });

    await expect(
      openRazorpayCheckout({
        keyId: 'rzp_test_example',
        providerOrderId: 'order_123',
        amount: 1035700,
        currency: 'INR',
        bookingId: 'booking-1',
      }),
    ).resolves.toEqual({
      razorpay_order_id: 'order_123',
      razorpay_payment_id: 'pay_123',
      razorpay_signature: 'signature',
    });

    expect(RazorpayCheckout.open).toHaveBeenCalledWith(
      expect.objectContaining({
        key: 'rzp_test_example',
        order_id: 'order_123',
        amount: 1035700,
        currency: 'INR',
      }),
    );
  });

  it('fails clearly when the native Razorpay module is not included in the app build', async () => {
    delete NativeModules.RNRazorpayCheckout;

    expect(isRazorpayCheckoutAvailable()).toBe(false);
    await expect(
      openRazorpayCheckout({
        keyId: 'rzp_test_example',
        providerOrderId: 'order_123',
        amount: 1035700,
        currency: 'INR',
        bookingId: 'booking-1',
      }),
    ).rejects.toBeInstanceOf(RazorpayCheckoutUnavailableError);
    expect(RazorpayCheckout.open).not.toHaveBeenCalled();
  });
});
