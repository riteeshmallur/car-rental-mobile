import { NativeModules, TurboModuleRegistry } from 'react-native';
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

type RazorpayNativeModule = {
  open?: unknown;
};

export class RazorpayCheckoutUnavailableError extends Error {
  constructor() {
    super(
      'Razorpay Checkout is unavailable in this app build. Install the HopIn development build or release build, then try again.',
    );
    this.name = 'RazorpayCheckoutUnavailableError';
  }
}

export function isRazorpayCheckoutAvailable() {
  const turboModule = (
    TurboModuleRegistry as unknown as
      | { get?: (name: string) => RazorpayNativeModule | null }
      | undefined
  )?.get?.('RNRazorpayCheckout');
  const legacyModule = NativeModules?.RNRazorpayCheckout as
    | RazorpayNativeModule
    | undefined;

  return typeof turboModule?.open === 'function' || typeof legacyModule?.open === 'function';
}

export async function openRazorpayCheckout(
  input: RazorpayCheckoutInput,
): Promise<RazorpayCheckoutResult> {
  if (!isRazorpayCheckoutAvailable()) {
    throw new RazorpayCheckoutUnavailableError();
  }

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
