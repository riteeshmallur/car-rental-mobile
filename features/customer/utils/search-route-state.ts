import {
  type VehicleSearchParams,
  type VehicleSearchSort,
} from '@/types/car';

export type SearchFilters = Pick<
  VehicleSearchParams,
  | 'vehicleType'
  | 'transmission'
  | 'fuelType'
  | 'minSeats'
  | 'minPrice'
  | 'maxPrice'
>;

export type SearchRouteState = {
  locationId?: string;
  locationName?: string;
  locationCity?: string;
  pickupDateTime?: string;
  returnDateTime?: string;
  filters: SearchFilters;
  sort: VehicleSearchSort;
};

type RouteParams = Record<string, string | string[] | undefined>;

const sortValues = new Set<VehicleSearchSort>([
  'recommended',
  'distance',
  'price_low_to_high',
  'price_high_to_low',
  'rating',
]);

function getParam(value: string | string[] | undefined) {
  const param = Array.isArray(value) ? value[0] : value;
  return param?.trim() || undefined;
}

function positiveNumber(value: string | undefined) {
  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

export function readSearchRouteState(params: RouteParams): SearchRouteState {
  const sort = getParam(params.sort);

  return {
    locationId: getParam(params.locationId),
    locationName: getParam(params.locationName),
    locationCity: getParam(params.locationCity),
    pickupDateTime: getParam(params.pickupDateTime),
    returnDateTime: getParam(params.returnDateTime),
    filters: {
      vehicleType: getParam(params.vehicleType),
      transmission: getParam(params.transmission),
      fuelType: getParam(params.fuelType),
      minSeats: positiveNumber(getParam(params.minSeats)),
      minPrice: positiveNumber(getParam(params.minPrice)),
      maxPrice: positiveNumber(getParam(params.maxPrice)),
    },
    sort: sort && sortValues.has(sort as VehicleSearchSort)
      ? (sort as VehicleSearchSort)
      : 'recommended',
  };
}

export function toSearchRouteParams(state: SearchRouteState) {
  return {
    locationId: state.locationId ?? '',
    locationName: state.locationName ?? '',
    locationCity: state.locationCity ?? '',
    pickupDateTime: state.pickupDateTime ?? '',
    returnDateTime: state.returnDateTime ?? '',
    vehicleType: state.filters.vehicleType ?? '',
    transmission: state.filters.transmission ?? '',
    fuelType: state.filters.fuelType ?? '',
    minSeats: state.filters.minSeats?.toString() ?? '',
    minPrice: state.filters.minPrice?.toString() ?? '',
    maxPrice: state.filters.maxPrice?.toString() ?? '',
    sort: state.sort,
  };
}

export function searchRouteKey(state: SearchRouteState) {
  return JSON.stringify(toSearchRouteParams(state));
}
