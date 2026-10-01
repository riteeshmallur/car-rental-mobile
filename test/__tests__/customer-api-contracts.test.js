const mockApiRequest = jest.fn();

jest.mock('@/services/api/client', () => ({ apiRequest: mockApiRequest }));

const { bookingsApi } = require('@/services/bookings/bookings-api');
const { quotesApi } = require('@/services/quotes/quotes-api');
const { rentersApi } = require('@/services/renters/renters-api');
const { usersApi } = require('@/services/users/users-api');
const { vehiclesApi } = require('@/services/vehicles/vehicles-api');

describe('customer live API contracts', () => {
  beforeEach(() => mockApiRequest.mockReset());

  it('covers favourites, notifications, reviews, and vehicle details', () => {
    rentersApi.getFavourites(2, 10);
    rentersApi.addFavourite('vehicle-1');
    rentersApi.removeFavourite('vehicle-1');
    rentersApi.getNotifications(3, 5);
    rentersApi.markNotificationRead('notification-1');
    rentersApi.getReviews(1, 10);
    vehiclesApi.findById('vehicle-1', { startsAt: '2026-10-20', endsAt: '2026-10-22' });
    vehiclesApi.findReviews('vehicle-1', 2, 3);

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, {
      method: 'GET', params: { limit: 10, page: 2 }, url: '/renters/me/favourites',
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, {
      method: 'POST', url: '/renters/me/favourites/vehicle-1',
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(3, {
      method: 'DELETE', url: '/renters/me/favourites/vehicle-1',
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(5, {
      method: 'PATCH', url: '/renters/me/notifications/notification-1/read',
    });
    expect(mockApiRequest).toHaveBeenNthCalledWith(8, {
      method: 'GET', params: { limit: 3, page: 2 }, url: '/vehicles/vehicle-1/reviews',
    });
  });

  it('creates quote, booking, payment, and trip requests with the selected window', () => {
    quotesApi.create({ carId: 'vehicle-1', pickupAt: '2026-10-20T10:00:00.000Z', returnAt: '2026-10-22T18:00:00.000Z' });
    bookingsApi.create({ carId: 'vehicle-1', idempotencyKey: 'booking-1', pickupAt: '2026-10-20T10:00:00.000Z', quoteId: 'quote-1', returnAt: '2026-10-22T18:00:00.000Z' });
    bookingsApi.findPayment('booking-1');
    bookingsApi.findTrip('booking-1');
    bookingsApi.cancel('booking-1', { reason: 'plans_changed' });
    bookingsApi.extend('booking-1', { returnAt: '2026-10-23T18:00:00.000Z' });
    bookingsApi.returnVehicle('booking-1', { fuelLevel: 'full', odometerReading: 200 });
    bookingsApi.createReview('booking-1', { comment: 'Great vehicle', rating: 5 });

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, expect.objectContaining({ method: 'POST', url: '/quotes' }));
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, expect.objectContaining({ method: 'POST', url: '/bookings' }));
    expect(mockApiRequest).toHaveBeenNthCalledWith(3, { method: 'GET', url: '/bookings/booking-1/payment' });
    expect(mockApiRequest).toHaveBeenNthCalledWith(4, { method: 'GET', url: '/bookings/booking-1/trip' });
    expect(mockApiRequest).toHaveBeenNthCalledWith(5, expect.objectContaining({ method: 'POST', url: '/bookings/booking-1/cancel' }));
    expect(mockApiRequest).toHaveBeenNthCalledWith(8, expect.objectContaining({ method: 'POST', url: '/bookings/booking-1/reviews' }));
  });

  it('keeps payment methods and privacy account actions behind live endpoints', () => {
    usersApi.paymentMethods();
    usersApi.setDefaultPaymentMethod('payment-1');
    usersApi.latestDataExport();
    usersApi.requestDataExport();
    usersApi.latestDeletionRequest();
    usersApi.requestDeletion();

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, { method: 'GET', url: '/users/me/payment-methods' });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, { method: 'PATCH', url: '/users/me/payment-methods/payment-1/default' });
    expect(mockApiRequest).toHaveBeenNthCalledWith(4, { method: 'POST', url: '/users/me/data-exports' });
    expect(mockApiRequest).toHaveBeenNthCalledWith(6, { method: 'POST', url: '/users/me/deletion-requests' });
  });
});
