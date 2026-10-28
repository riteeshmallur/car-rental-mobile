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
  | 'distance'
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
  thumbnailUrl?: string;
  detailUrl?: string;
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

export type HostVehicleListingStatus =
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'CHANGES_REQUIRED'
  | 'PUBLISHED'
  | 'PAUSED'
  | 'REJECTED'
  | 'ARCHIVED';

export type HostVehicleListing = {
  id: string;
  hostId: string;
  locationId: string | null;
  make: string | null;
  model: string | null;
  manufacturingYear: number | null;
  registrationNumber: string | null;
  pricePerDay: string | null;
  vehicleType: string | null;
  transmission: string | null;
  fuelType: string | null;
  seats: number | null;
  doors: number | null;
  colour: string | null;
  securityDeposit: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: string | null;
  longitude: string | null;
  mileageLimitPerDay: number | null;
  minimumRentalDays: number | null;
  maximumRentalDays: number | null;
  status: HostVehicleListingStatus;
  available: boolean;
  draftStep: string | null;
  features: string[];
  imageUrls: string[];
  listingDocuments: Record<string, unknown>;
  availabilitySettings: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type UpsertHostVehiclePayload = Partial<{
  locationId: string | null;
  make: string | null;
  model: string | null;
  manufacturingYear: number | null;
  registrationNumber: string | null;
  vehicleType: string | null;
  transmission: string | null;
  fuelType: string | null;
  seats: number | null;
  doors: number | null;
  colour: string | null;
  description: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  latitude: number | null;
  longitude: number | null;
  pricePerDay: number | null;
  securityDeposit: number | null;
  mileageLimitPerDay: number | null;
  minimumRentalDays: number | null;
  maximumRentalDays: number | null;
  features: string[];
  imageUrls: string[];
  listingDocuments: Record<string, unknown>;
  availabilitySettings: Record<string, unknown>;
  draftStep: string | null;
  available: boolean;
  status: 'published' | 'paused';
}>;

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

export type RenterTripPhase =
  | 'payment_required'
  | 'awaiting_host_approval'
  | 'upcoming'
  | 'active'
  | 'return_pending'
  | 'completed'
  | 'cancelled'
  | 'disputed';

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

export type RenterTripStage =
  | 'upcoming'
  | 'confirmed'
  | 'active'
  | 'return_pending'
  | 'completed'
  | 'cancelled'
  | 'disputed'
  | 'pending';

export type RenterTripCapabilities = {
  viewBookingDetails: boolean;
  viewPickupInformation: boolean;
  cancel: boolean;
  viewTripDetails: boolean;
  requestExtension: boolean;
  viewReturnInstructions: boolean;
  reportIssue: boolean;
  viewReturnStatus: boolean;
  review: boolean;
  viewReceipt: boolean;
  viewCancellationRefund: boolean;
  viewDisputeStatus: boolean;
};

export type RenterTrip = {
  id: string;
  reference: string;
  status: string;
  stage: RenterTripStage;
  paymentStatus: string | null;
  pickupAt: string;
  returnAt: string;
  currency: string;
  pricing: {
    basePrice: string | null;
    serviceFee: string | null;
    taxes: string | null;
    securityDeposit: string | null;
    discounts: string | null;
    totalPrice: string;
  };
  vehicle: {
    id: string;
    make: string;
    model: string;
    imageUrl: string | null;
  };
  pickup: {
    verifiedAt: string | null;
    location: {
      name: string | null;
      address: string | null;
      city: string | null;
      state: string | null;
      country: string | null;
    };
    hostName: string;
    hostPhoneNumber: string | null;
  };
  return: {
    returnedAt: string | null;
    inspectionStatus: 'not_started' | 'recorded';
  };
  cancellation: {
    reason: string | null;
    refundAmount: string | null;
    refundStatus: string | null;
  } | null;
  dispute: {
    id: string;
    status: string;
    reason: string;
    openedAt: string;
  } | null;
  review: {
    id: string;
    reviewType: 'vehicle' | 'host';
    rating: number;
    comment: string | null;
    status: 'pending' | 'published' | 'rejected' | 'hidden';
    createdAt: string;
  } | null;
  capabilities: RenterTripCapabilities;
};

export type BookingPayment = {
  id: string;
  bookingId: string;
  provider: string;
  providerPaymentId: string | null;
  providerOrderId: string | null;
  providerTransactionId: string | null;
  providerSignatureVerifiedAt: string | null;
  providerStatus: string | null;
  status: string;
  amount: string;
  currency: string;
  failureCode: string | null;
  failureMessage: string | null;
  createdAt: string;
  updatedAt: string;
  checkout?: {
    provider: 'razorpay';
    providerOrderId: string;
    keyId: string;
    amount: number;
    currency: string;
  };
  refunds: Array<{
    id: string;
    amount: string;
    currency: string;
    status: 'pending' | 'succeeded' | 'failed' | 'cancelled';
    reason: string | null;
    createdAt: string;
  }>;
};

export type BookingReceipt = {
  bookingId: string;
  reference: string;
  issuedAt: string;
  currency: string;
  paymentStatus: string | null;
  vehicle: RenterTrip['vehicle'];
  pickupAt: string;
  returnAt: string;
  pricing: RenterTrip['pricing'];
};

export type HostBookingPhase =
  | 'requests'
  | 'upcoming'
  | 'active'
  | 'completed'
  | 'cancelled';

export type HostBooking = Booking & {
  reference: string;
  hostPhase: HostBookingPhase;
  amount: string;
  manualApprovalRequired: boolean;
  customer: {
    id: string;
    name: string;
    phoneNumber: string | null;
    profileImageUrl: string | null;
  };
  vehicle: {
    id: string;
    make: string;
    model: string;
    imageUrl: string | null;
  };
};

export type HostPayoutStatus = 'pending' | 'completed' | 'cancelled' | 'failed';

export type HostEarningEntry = {
  id: string;
  bookingId: string;
  bookingReference: string;
  grossRentalAmount: string;
  platformCommission: string;
  hostNetAmount: string;
  payoutStatus: HostPayoutStatus;
  paidAt: string;
  vehicle: {
    id: string;
    make: string;
    model: string;
    imageUrl: string | null;
  };
};

export type HostEarningsParams = {
  startsAt?: string;
  endsAt?: string;
  page?: number;
  limit?: number;
};

export type HostEarningsResponse = {
  totalEarnings: string;
  thisMonthEarnings: string;
  pendingPayouts: string;
  completedPayouts: string;
  items: HostEarningEntry[];
  meta: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
};

export type HostPayoutsResponse = {
  items: HostEarningEntry[];
  meta: HostEarningsResponse['meta'];
};

export type HostDashboard = {
  activeListings: number;
  pendingListingReviews: number;
  bookingRequests: number;
  activeTrips: number;
  pendingPayoutAmount: string;
};

export type HostCalendarEvent = {
  id: string;
  type: 'booking' | 'block';
  vehicleId: string;
  startsAt: string;
  endsAt: string;
  status: string;
  label: string | null;
};

export type HostPayoutRecord = {
  id: string;
  status: string;
  currency: string;
  grossAmount: string;
  platformCommission: string;
  taxWithheld: string;
  netAmount: string;
  createdAt: string;
  processedAt: string | null;
};

export type AvailabilityBlock = {
  id: string;
  vehicleId: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
};

export type PricingRule = {
  id: string;
  vehicleId: string;
  ruleType: 'weekend' | 'seasonal';
  startsOn: string | null;
  endsOn: string | null;
  pricePerDay: string;
  priority: number;
  active: boolean;
};

export type CreateQuotePayload = {
  carId: string;
  pickupAt: string;
  returnAt: string;
};

export type CreateBookingPayload = {
  quoteId: string;
  idempotencyKey: string;
};
