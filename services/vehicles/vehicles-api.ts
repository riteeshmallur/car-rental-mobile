import { apiRequest } from '@/services/api/client';
import { Platform } from 'react-native';
import {
  type VehicleAvailability,
  type VehicleDetail,
  type VehicleDetailsParams,
  type VehicleReviewsResponse,
  type HostVehicleListing,
  type UpsertHostVehiclePayload,
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
  createDraft(payload: UpsertHostVehiclePayload) {
    return apiRequest<HostVehicleListing>({
      method: 'POST',
      url: '/vehicles',
      data: payload,
    });
  },
  updateDraft(vehicleId: string, payload: UpsertHostVehiclePayload) {
    return apiRequest<HostVehicleListing>({
      method: 'PATCH',
      url: `/vehicles/${vehicleId}`,
      data: payload,
    });
  },
  async uploadImage(vehicleId: string, imageUri: string) {
    const extension = imageUri.split('.').pop()?.toLowerCase();
    const normalizedExtension = extension === 'png' ? 'png' : 'jpg';
    const filename = `vehicle-${Date.now()}.${normalizedExtension}`;
    const formData = new FormData();
    const image =
      Platform.OS === 'web'
        ? await fetch(imageUri).then((response) => response.blob())
        : ({
            name: filename,
            type: normalizedExtension === 'png' ? 'image/png' : 'image/jpeg',
            uri: imageUri,
          } as unknown as Blob);

    formData.append('image', image, filename);

    return apiRequest<HostVehicleListing>({
      method: 'POST',
      url: `/vehicles/${vehicleId}/images`,
      data: formData,
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  submit(vehicleId: string) {
    return apiRequest<HostVehicleListing>({
      method: 'POST',
      url: `/vehicles/${vehicleId}/submit`,
    });
  },
};
