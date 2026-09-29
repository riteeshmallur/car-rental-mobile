import { apiRequest } from '@/services/api/client';
import {
  type Booking,
  type BookingPayment,
  type BookingReceipt,
  type CreateBookingPayload,
  type RenterBooking,
  type RenterTrip,
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
  findTrip(bookingId: string) {
    return apiRequest<RenterTrip>({
      method: 'GET',
      url: `/bookings/${bookingId}/trip`,
    });
  },
  findPayment(bookingId: string) {
    return apiRequest<BookingPayment>({
      method: 'GET',
      url: `/bookings/${bookingId}/payment`,
    });
  },
  findReceipt(bookingId: string) {
    return apiRequest<BookingReceipt>({
      method: 'GET',
      url: `/bookings/${bookingId}/receipt`,
    });
  },
  cancel(bookingId: string, payload: { reason?: string; note?: string } = {}) {
    return apiRequest<Booking>({
      method: 'POST',
      url: `/bookings/${bookingId}/cancel`,
      data: payload,
    });
  },
  extend(bookingId: string, payload: { returnAt: string }) {
    return apiRequest<Booking>({
      method: 'POST',
      url: `/bookings/${bookingId}/extend`,
      data: payload,
    });
  },
  returnVehicle(
    bookingId: string,
    payload: {
      odometerReading: number;
      fuelLevel: 'empty' | 'quarter' | 'half' | 'three_quarters' | 'full';
      returnedAt?: string;
      note?: string;
    },
  ) {
    return apiRequest<Booking>({
      method: 'POST',
      url: `/bookings/${bookingId}/return`,
      data: payload,
    });
  },
  dispute(bookingId: string, payload: { reason: string; evidenceUrls?: string[] }) {
    return apiRequest<Booking>({
      method: 'POST',
      url: `/bookings/${bookingId}/dispute`,
      data: payload,
    });
  },
  createReview(
    bookingId: string,
    payload: { rating: number; comment?: string; reviewType?: 'vehicle' | 'host' },
  ) {
    return apiRequest<RenterTrip['review']>({
      method: 'POST',
      url: `/bookings/${bookingId}/reviews`,
      data: payload,
    });
  },
  approve(bookingId: string, payload: { note?: string } = {}) {
    return apiRequest<Booking>({ method: 'POST', url: `/bookings/${bookingId}/approve`, data: payload });
  },
  reject(bookingId: string, payload: { reason?: string; note?: string } = {}) {
    return apiRequest<Booking>({ method: 'POST', url: `/bookings/${bookingId}/reject`, data: payload });
  },
};
