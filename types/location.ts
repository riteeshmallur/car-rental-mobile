export type LocationSuggestion = {
  id: string;
  displayName: string;
  city: string;
  state: string | null;
  country: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
};

export type LocationSearchResult = {
  id: string;
  name: string;
  city: string;
  state: string | null;
  country: string;
  latitude: number;
  longitude: number;
};

export type LocationSearchResponse = {
  data: LocationSearchResult[];
  meta: {
    query: string;
    count: number;
    limit: number;
    offset: number;
  };
};

export type LocationSuggestionsResponse = {
  data: LocationSuggestion[];
  meta: {
    query: string;
    count: number;
  };
};
