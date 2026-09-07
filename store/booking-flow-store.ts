import { create } from 'zustand';

import { type Booking, type BookingQuote } from '@/types/car';

type BookingFlowState = {
  quote: BookingQuote | null;
  booking: Booking | null;
  setQuote: (quote: BookingQuote | null) => void;
  setBooking: (booking: Booking | null) => void;
  clear: () => void;
};

export const useBookingFlowStore = create<BookingFlowState>((set) => ({
  quote: null,
  booking: null,
  setQuote: (quote) => set({ quote }),
  setBooking: (booking) => set({ booking }),
  clear: () => set({ quote: null, booking: null }),
}));
