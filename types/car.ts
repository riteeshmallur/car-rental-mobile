export type Car = {
  id: string;
  locationId?: string | null;
  make: string;
  model: string;
  manufacturingYear: number;
  registrationNumber: string;
  pricePerDay: string;
  imageUrl?: string | null;
  vehicleType: string;
  transmission: string;
  fuelType: string;
  seats: number;
  doors: number;
  colour?: string | null;
  securityDeposit: string;
  description?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  country?: string | null;
  mileageLimitPerDay?: number | null;
  minimumRentalDays: number;
  maximumRentalDays?: number | null;
  status: string;
  available: boolean;
  isSoldOut: boolean;
  bookable: boolean;
  createdAt: string;
  updatedAt: string;
};

export type SearchCarsParams = {
  locationId: string;
  pickupAt: string;
  returnAt: string;
};

export type VehicleSearchSort =
  | 'recommended'
  | 'price_low_to_high'
  | 'price_high_to_low'
  | 'rating';

export type VehicleSearchParams = {
  locationId: string;
  startsAt: string;
  endsAt: string;
  vehicleType?: string;
  transmission?: string;
  fuelType?: string;
  minSeats?: number;
  minPrice?: number;
  maxPrice?: number;
  sort?: VehicleSearchSort;
  page?: number;
  limit?: number;
};

export type VehicleSearchResult = {
  id: string;
  locationId: string;
  make: string;
  model: string;
  manufacturingYear: number;
  vehicleType: string;
  transmission: string;
  fuelType: string;
  seats: number;
  dailyPrice: number;
  estimatedTotalPrice: number;
  rentalDays: number;
  imageUrl: string | null;
  rating: number;
  ratingCount: number;
  distanceKm: number | null;
  location: {
    name: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
  };
};

export type VehicleSearchResponse = {
  items: VehicleSearchResult[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
};

export type VehicleImage = {
  id: string;
  url: string;
  isPrimary: boolean;
};

export type VehicleAvailability = {
  available: boolean;
  reason: string | null;
};

export type VehicleDetail = {
  id: string;
  locationId: string;
  make: string;
  model: string;
  manufacturingYear: number;
  vehicleType: string;
  transmission: string;
  fuelType: string;
  seats: number;
  doors: number;
  colour: string | null;
  dailyPrice: number;
  estimatedTotalPrice: number | null;
  rentalDays: number | null;
  securityDeposit: number;
  description: string | null;
  mileageLimitPerDay: number | null;
  features: string[];
  images: VehicleImage[];
  rating: number;
  reviewCount: number;
  pickupLocation: {
    id: string | null;
    name: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
    latitude: number | null;
    longitude: number | null;
  };
  host: {
    id: string;
    name: string;
    profileImageUrl: string | null;
    rating: number;
    reviewCount: number;
    joinedAt: string;
  };
  availability: VehicleAvailability;
  rentalRules: {
    minimumRentalDays: number;
    maximumRentalDays: number | null;
    mileageLimitPerDay: number | null;
    securityDeposit: number;
  };
};

export type VehicleReview = {
  id: string;
  rating: number;
  comment: string | null;
  reviewerName: string;
  createdAt: string;
};

export type VehicleReviewsResponse = {
  items: VehicleReview[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
};

export type VehicleDetailsParams = {
  startsAt?: string;
  endsAt?: string;
};

export type BookingQuote = {
  id: string;
  carId: string;
  userId: string;
  pickupAt: string;
  returnAt: string;
  rentalDays: number;
  currency: string;
  basePrice: string;
  serviceFee: string;
  taxes: string;
  securityDeposit: string;
  discounts: string;
  totalAmount: string;
  expiresAt: string;
  status: string;
  vehicle: {
    id: string;
    make: string;
    model: string;
    imageUrl: string | null;
    locationName: string | null;
  };
};

export type Booking = {
  id: string;
  carId: string;
  userId: string;
  quoteId: string | null;
  pickupAt: string;
  returnAt: string;
  status: string;
  currency: string;
  basePrice: string | null;
  serviceFee: string | null;
  taxes: string | null;
  securityDeposit: string | null;
  discounts: string | null;
  totalPrice: string;
  paymentStatus: string;
  createdAt: string;
  updatedAt: string;
};

export type RenterTripPhase = 'upcoming' | 'active' | 'past' | 'cancelled';

export type RenterBooking = Booking & {
  reference: string;
  totalPaid: string;
  tripPhase: RenterTripPhase;
  vehicle: {
    id: string;
    make: string;
    model: string;
    imageUrl: string | null;
  };
  pickupLocation: {
    name: string | null;
    city: string | null;
    state: string | null;
    country: string | null;
  };
  host: {
    id: string;
    name: string;
    phoneNumber: string | null;
  };
};

export type CreateQuotePayload = {
  carId: string;
  pickupAt: string;
  returnAt: string;
};

export type CreateBookingPayload = {
  carId: string;
  quoteId: string;
  pickupAt: string;
  returnAt: string;
  idempotencyKey: string;
};
