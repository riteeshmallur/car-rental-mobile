import { apiRequest } from '@/services/api/client';
import { type BookingQuote, type CreateQuotePayload } from '@/types/car';

export const quotesApi = {
  create(payload: CreateQuotePayload) {
    return apiRequest<BookingQuote>({
      method: 'POST',
      url: '/quotes',
      data: payload,
    });
  },
};
