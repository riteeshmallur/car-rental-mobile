import { apiRequest } from '@/services/api/client';
import {
  type Booking,
  type CreateBookingPayload,
  type RenterBooking,
} from '@/types/car';

export const bookingsApi = {
  listRenterBookings() {
    return apiRequest<RenterBooking[]>({
      method: 'GET',
      url: '/renters/me/bookings',
    });
  },
  create(payload: CreateBookingPayload) {
    return apiRequest<Booking>({
      method: 'POST',
      url: '/bookings',
      data: payload,
    });
  },
  findById(bookingId: string) {
    return apiRequest<Booking>({
      method: 'GET',
      url: `/bookings/${bookingId}`,
    });
  },
  cancel(bookingId: string) {
    return apiRequest<Booking>({
      method: 'POST',
      url: `/bookings/${bookingId}/cancel`,
    });
  },
};
