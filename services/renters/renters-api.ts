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
};
