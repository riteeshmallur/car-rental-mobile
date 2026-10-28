const React = require('react');
const { fireEvent, waitFor } = require('@testing-library/react-native');

const mockListRenterBookings = jest.fn();

jest.mock('@/services/bookings/bookings-api', () => ({
  bookingsApi: {
    listRenterBookings: (...args) => mockListRenterBookings(...args),
  },
}));

const { TripsScreen } = require('@/features/customer/screens/trips-screen');
const { renderWithProviders } = require('../render-with-providers');

const pendingBooking = {
  basePrice: '3000.00',
  carId: 'vehicle-1',
  createdAt: '2026-10-28T08:00:00.000Z',
  currency: 'INR',
  discounts: '0.00',
  host: { id: 'host-1', name: 'Host One', phoneNumber: '+919999999999' },
  id: 'booking-pending-payment',
  paymentStatus: 'pending',
  pickupAt: '2026-11-01T04:30:00.000Z',
  pickupLocation: {
    city: 'Bengaluru',
    country: 'India',
    name: 'Indiranagar',
    state: 'Karnataka',
  },
  quoteId: 'quote-1',
  reference: 'booking-pending-payment',
  returnAt: '2026-11-03T12:30:00.000Z',
  securityDeposit: '2000.00',
  serviceFee: '150.00',
  status: 'pending_payment',
  taxes: '204.00',
  totalPaid: '0.00',
  totalPrice: '5354.00',
  tripPhase: 'payment_required',
  updatedAt: '2026-10-28T08:00:00.000Z',
  userId: 'customer-1',
  vehicle: { id: 'vehicle-1', imageUrl: null, make: 'Maruti', model: 'Swift' },
};

describe('Trips payment-required state', () => {
  beforeEach(() => {
    mockListRenterBookings.mockReset();
    mockListRenterBookings.mockResolvedValue([pendingBooking]);
    global.__testRouteParams.mockReturnValue({ tab: 'payment_required' });
  });

  it('shows the authoritative total and resumes payment instead of classifying the booking as upcoming', async () => {
    const screen = renderWithProviders(React.createElement(TripsScreen));

    await waitFor(() => expect(screen.getByText('Amount due')).toBeTruthy());

    expect(screen.getAllByText('Payment required').length).toBeGreaterThan(0);
    expect(screen.getByText('₹5,354')).toBeTruthy();
    expect(screen.queryByText('₹0')).toBeNull();

    fireEvent.press(screen.getByLabelText('Complete payment for Maruti Swift'));

    expect(global.__testRouter.push).toHaveBeenCalledWith({
      pathname: '/(customer)/booking/payment',
      params: { bookingId: 'booking-pending-payment', origin: 'customer-trips' },
    });
  });
});
