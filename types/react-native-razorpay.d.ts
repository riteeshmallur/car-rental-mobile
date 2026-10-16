declare module 'react-native-razorpay' {
  type CheckoutOptions = {
    key: string;
    amount: number;
    currency: string;
    name: string;
    description: string;
    order_id: string;
  };

  const RazorpayCheckout: {
    open(options: CheckoutOptions): Promise<Record<string, unknown>>;
  };

  export default RazorpayCheckout;
}
