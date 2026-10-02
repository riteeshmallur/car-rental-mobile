const React = require('react');
const { render, waitFor } = require('@testing-library/react-native');

const mockUseQuery = jest.fn();
const mockUseMutation = jest.fn();
const mockInvalidateQueries = jest.fn();

jest.mock('@tanstack/react-query', () => ({
  useMutation: (...args) => mockUseMutation(...args),
  useQuery: (...args) => mockUseQuery(...args),
  useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
}));

const { PaymentScreen } = require('@/features/customer/screens/payment-screen');

const booking = {
  id: 'booking-1',
  status: 'confirmed',
  totalPrice: '5498',
};

const paidPayment = {
  amount: '5498',
  id: 'payment-1',
  status: 'paid',
};

function queryResult(data) {
  return {
    data,
    isError: false,
    isFetching: false,
    isPending: false,
    isSuccess: true,
    refetch: jest.fn(),
  };
}

describe('payment screen confirmation navigation', () => {
  beforeEach(() => {
    global.__testRouteParams.mockReturnValue({ bookingId: 'booking-1' });
    mockInvalidateQueries.mockReset();
    mockUseQuery.mockReset();
    mockUseMutation.mockImplementation(() => ({ isError: false, isPending: false, mutate: jest.fn() }));
  });

  it('navigates to confirmation only after the booking and payment are both confirmed', async () => {
    mockUseQuery.mockImplementation(({ queryKey }) =>
      queryKey[1] === 'payment' ? queryResult(paidPayment) : queryResult(booking),
    );

    render(React.createElement(PaymentScreen));

    await waitFor(() => {
      expect(global.__testRouter.replace).toHaveBeenCalledWith({
        pathname: '/(customer)/booking/confirmation',
        params: { bookingId: 'booking-1' },
      });
    });
  });

  it('keeps a pending booking on the payment screen even when payment is marked paid', () => {
    mockUseQuery.mockImplementation(({ queryKey }) =>
      queryKey[1] === 'payment'
        ? queryResult(paidPayment)
        : queryResult({ ...booking, status: 'pending_payment' }),
    );

    const screen = render(React.createElement(PaymentScreen));

    expect(screen.getByText('Payment Processing')).toBeTruthy();
    expect(global.__testRouter.replace).not.toHaveBeenCalledWith(
      expect.objectContaining({ pathname: '/(customer)/booking/confirmation' }),
    );
  });
});
