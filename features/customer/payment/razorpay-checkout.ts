import RazorpayCheckout from 'react-native-razorpay';

export type RazorpayCheckoutInput = {
  keyId: string;
  providerOrderId: string;
  amount: number;
  currency: string;
  bookingId: string;
};

export type RazorpayCheckoutResult = {
  razorpay_order_id: string;
  razorpay_payment_id: string;
  razorpay_signature: string;
};

export async function openRazorpayCheckout(
  input: RazorpayCheckoutInput,
): Promise<RazorpayCheckoutResult> {
  const result = await RazorpayCheckout.open({
    key: input.keyId,
    amount: input.amount,
    currency: input.currency,
    name: 'HopIn',
    description: `Booking ${input.bookingId}`,
    order_id: input.providerOrderId,
  });
  return result as RazorpayCheckoutResult;
}
