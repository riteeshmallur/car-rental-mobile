import { apiRequest } from '@/services/api/client';

export type RenterFavourite = {
  id: string;
  createdAt: string;
  vehicle: {
    id: string;
    make: string;
    model: string;
    imageUrl: string | null;
    pricePerDay: string;
    pickupLocation: string | null;
    averageRating: number;
    reviewCount: number;
  };
};

export type RenterFavouritesResponse = {
  items: RenterFavourite[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
};

export type RenterNotification = {
  id: string;
  type: string;
  title: string;
  body: string;
  isRead: boolean;
  data: Record<string, unknown>;
  createdAt: string;
};

export type RenterNotificationsResponse = {
  items: RenterNotification[];
  meta: RenterFavouritesResponse['meta'];
};

export type RenterReview = {
  id: string;
  reviewType: 'vehicle' | 'host';
  status: 'pending' | 'published' | 'rejected' | 'hidden';
  rating: number;
  comment: string | null;
  createdAt: string;
  bookingId: string | null;
  vehicle: {
    id: string;
    make: string;
    model: string;
    imageUrl: string | null;
  };
};

export type RenterReviewsResponse = {
  items: RenterReview[];
  meta: RenterFavouritesResponse['meta'];
};

export const rentersApi = {
  getFavourites(page = 1, limit = 20) {
    return apiRequest<RenterFavouritesResponse>({
      method: 'GET',
      url: '/renters/me/favourites',
      params: { page, limit },
    });
  },
  addFavourite(vehicleId: string) {
    return apiRequest<{ vehicleId: string; favourited: boolean }>({
      method: 'POST',
      url: `/renters/me/favourites/${vehicleId}`,
    });
  },
  removeFavourite(vehicleId: string) {
    return apiRequest<{ vehicleId: string; favourited: boolean }>({
      method: 'DELETE',
      url: `/renters/me/favourites/${vehicleId}`,
    });
  },
  getNotifications(page = 1, limit = 20) {
    return apiRequest<RenterNotificationsResponse>({
      method: 'GET',
      url: '/renters/me/notifications',
      params: { page, limit },
    });
  },
  markNotificationRead(notificationId: string) {
    return apiRequest<RenterNotification>({
      method: 'PATCH',
      url: `/renters/me/notifications/${notificationId}/read`,
    });
  },
  getReviews(page = 1, limit = 20) {
    return apiRequest<RenterReviewsResponse>({
      method: 'GET',
      url: '/renters/me/reviews',
      params: { page, limit },
    });
  },
};
