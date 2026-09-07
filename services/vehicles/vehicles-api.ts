import { apiRequest } from '@/services/api/client';
import {
  type VehicleAvailability,
  type VehicleDetail,
  type VehicleDetailsParams,
  type VehicleReviewsResponse,
} from '@/types/car';

export const vehiclesApi = {
  findById(vehicleId: string, params: VehicleDetailsParams) {
    return apiRequest<VehicleDetail>({
      method: 'GET',
      url: `/vehicles/${vehicleId}`,
      params,
    });
  },
  findReviews(vehicleId: string, page = 1, limit = 5) {
    return apiRequest<VehicleReviewsResponse>({
      method: 'GET',
      url: `/vehicles/${vehicleId}/reviews`,
      params: { page, limit },
    });
  },
  checkAvailability(vehicleId: string, params: VehicleDetailsParams) {
    return apiRequest<VehicleAvailability>({
      method: 'GET',
      url: `/vehicles/${vehicleId}/availability`,
      params,
    });
  },
};
