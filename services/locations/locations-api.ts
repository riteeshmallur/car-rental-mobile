import { apiClient } from '@/services/api/client';
import {
  type LocationSearchResponse,
  type LocationSearchResult,
  type LocationSuggestion,
  type LocationSuggestionsResponse,
} from '@/types/location';

export const locationsApi = {
  async search(query: string, limit = 10, offset = 0) {
    const response = await apiClient.get<LocationSearchResponse>(
      '/locations/search',
      {
        params: {
          q: query,
          limit,
          offset,
        },
      },
    );

    return response.data.data;
  },
  async getSuggestions(query: string, limit = 5) {
    const response = await apiClient.get<LocationSuggestionsResponse>(
      '/locations/suggestions',
      {
        params: {
          q: query,
          limit,
        },
      },
    );

    return response.data.data;
  },
  async getDetails(id: string) {
    const response = await apiClient.get<{ data: LocationSuggestion }>(
      `/locations/${id}`,
    );

    return response.data.data;
  },
};

export function toLocationSearchResult(
  suggestion: LocationSuggestion,
): LocationSearchResult {
  return {
    id: suggestion.id,
    name: suggestion.displayName,
    city: suggestion.city,
    state: suggestion.state,
    country: suggestion.country,
    latitude: suggestion.latitude,
    longitude: suggestion.longitude,
  };
}
