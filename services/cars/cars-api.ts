import { apiRequest } from '@/services/api/client';
import {
  type Car,
  type SearchCarsParams,
  type VehicleSearchParams,
  type VehicleSearchResponse,
} from '@/types/car';

export const carsApi = {
  searchAvailable(params: SearchCarsParams) {
    return apiRequest<Car[]>({
      method: 'GET',
      url: '/cars',
      params,
    });
  },
  searchVehicles(params: VehicleSearchParams) {
    return apiRequest<VehicleSearchResponse>({
      method: 'GET',
      url: '/search/vehicles',
      params,
    });
  },
};
