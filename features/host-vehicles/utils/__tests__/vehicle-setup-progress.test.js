const {
  getVehicleDraftName,
  getVehicleSetupProgress,
  getVehicleSetupSectionLabel,
  isVehicleSetupReadyForSubmission,
} = require('@/features/host-vehicles/utils/vehicle-setup-progress');

function listing(overrides = {}) {
  return {
    address: null,
    availabilitySettings: {},
    available: false,
    city: null,
    colour: null,
    country: null,
    createdAt: '2026-10-01T00:00:00.000Z',
    description: null,
    doors: 4,
    draftStep: 'details',
    features: [],
    fuelType: 'petrol',
    hostId: 'host-1',
    id: 'vehicle-1',
    imageUrls: [],
    latitude: null,
    listingDocuments: {},
    locationId: null,
    longitude: null,
    make: 'Hyundai',
    manufacturingYear: 2024,
    maximumRentalDays: null,
    mileageLimitPerDay: null,
    minimumRentalDays: 1,
    model: 'Creta',
    pricePerDay: null,
    registrationNumber: 'KA01AB1234',
    seats: 5,
    securityDeposit: null,
    state: null,
    status: 'DRAFT',
    transmission: 'automatic',
    updatedAt: '2026-10-02T00:00:00.000Z',
    vehicleType: 'suv',
    ...overrides,
  };
}

describe('vehicle setup progress', () => {
  it('resumes at pickup location after details and photos are complete', () => {
    const progress = getVehicleSetupProgress(
      listing({ imageUrls: ['https://cdn.example.com/vehicle.jpg'] }),
    );

    expect(progress).toEqual({
      completed: 2,
      nextSection: 'location',
      percentage: 40,
      total: 5,
    });
    expect(getVehicleSetupSectionLabel(progress.nextSection)).toBe('Pickup location');
  });

  it('routes a complete draft to review and submit', () => {
    const vehicle = listing({
      address: '12 MG Road',
      availabilitySettings: { availableFrom: '2026-11-01' },
      city: 'Bengaluru',
      country: 'India',
      imageUrls: ['https://cdn.example.com/vehicle.jpg'],
      listingDocuments: {
        insuranceImageUrl: '/uploads/insurance.jpg',
        insurancePolicyNumber: 'INS123',
        registrationCertificateImageUrl: '/uploads/rc.jpg',
        registrationCertificateNumber: 'RC123',
      },
      locationId: 'location-1',
      pricePerDay: '2499',
      state: 'Karnataka',
    });
    const progress = getVehicleSetupProgress(vehicle);

    expect(progress.nextSection).toBe('review');
    expect(progress.percentage).toBe(100);
    expect(isVehicleSetupReadyForSubmission(vehicle)).toBe(true);
  });

  it('does not make an incomplete listing ready for submission', () => {
    expect(isVehicleSetupReadyForSubmission(listing())).toBe(false);
  });

  it('does not treat document numbers as complete until RC and insurance uploads exist', () => {
    const progress = getVehicleSetupProgress(
      listing({
        address: '12 MG Road',
        availabilitySettings: { availableFrom: '2026-11-01' },
        city: 'Bengaluru',
        country: 'India',
        imageUrls: ['https://cdn.example.com/vehicle.jpg'],
        listingDocuments: {
          insurancePolicyNumber: 'INS123',
          registrationCertificateNumber: 'RC123',
        },
        locationId: 'location-1',
        pricePerDay: '2499',
        state: 'Karnataka',
      }),
    );

    expect(progress).toMatchObject({
      completed: 4,
      nextSection: 'documents',
      total: 5,
    });
  });

  it('requires both pricing and availability before rental settings are complete', () => {
    const progress = getVehicleSetupProgress(
      listing({
        address: '12 MG Road',
        city: 'Bengaluru',
        country: 'India',
        imageUrls: ['https://cdn.example.com/vehicle.jpg'],
        listingDocuments: {
          insuranceImageUrl: '/uploads/insurance.jpg',
          insurancePolicyNumber: 'INS123',
          registrationCertificateImageUrl: '/uploads/rc.jpg',
          registrationCertificateNumber: 'RC123',
        },
        locationId: 'location-1',
        pricePerDay: '2499',
        state: 'Karnataka',
      }),
    );

    expect(progress.nextSection).toBe('rental_settings');
    expect(getVehicleSetupSectionLabel('rental_settings')).toBe('Rental settings');
  });

  it('uses a friendly draft name when vehicle fields are missing', () => {
    expect(getVehicleDraftName(listing({ make: null, model: null }))).toBe('Vehicle draft');
  });
});
