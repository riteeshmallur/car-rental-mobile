import { apiRequest } from '@/services/api/client';

type RenterFavourite = {
  id: string;
  vehicle: {
    id: string;
  };
};

type RenterFavouritesResponse = {
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
  getFavourites() {
    return apiRequest<RenterFavouritesResponse>({
      method: 'GET',
      url: '/renters/me/favourites',
      params: { page: 1, limit: 100 },
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
