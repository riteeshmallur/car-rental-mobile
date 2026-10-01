const mockApiRequest = jest.fn();

jest.mock('@/services/api/client', () => ({ apiRequest: mockApiRequest }));

const { hostsApi } = require('@/services/hosts/hosts-api');
const { vehiclesApi } = require('@/services/vehicles/vehicles-api');
const {
  hostVehicleDefaultValues,
  hostVehicleFormSchema,
} = require('@/features/host-vehicles/schemas/host-vehicle-form-schema');
const { bookingsApi } = require('@/services/bookings/bookings-api');

describe('host mode, add vehicle, and booking actions', () => {
  beforeEach(() => mockApiRequest.mockReset());

  it('validates a draft before add-vehicle submission', () => {
    const invalid = hostVehicleFormSchema.safeParse(hostVehicleDefaultValues);
    const valid = hostVehicleFormSchema.safeParse({
      ...hostVehicleDefaultValues,
      address: '12 MG Road',
      availableFrom: '2026-10-20',
      city: 'Bengaluru',
      description: 'A clean and reliable SUV for city and highway journeys.',
      features: ['Bluetooth'],
      imageUrls: ['https://cdn.example.com/vehicle.jpg'],
      insurancePolicyNumber: 'INS-1234',
      locationId: 'location-1',
      make: 'Hyundai',
      manufacturingYear: '2024',
      model: 'Creta',
      pricePerDay: '2499',
      registrationCertificateNumber: 'RC-1234',
      registrationNumber: 'KA01AB1234',
      state: 'Karnataka',
    });

    expect(invalid.success).toBe(false);
    expect(valid.success).toBe(true);
  });

  it('rejects a maximum rental duration below the minimum', () => {
    const result = hostVehicleFormSchema.safeParse({
      ...hostVehicleDefaultValues,
      address: '12 MG Road', availableFrom: '2026-10-20', city: 'Bengaluru',
      description: 'A clean and reliable SUV for city and highway journeys.', features: ['Bluetooth'],
      imageUrls: ['https://cdn.example.com/vehicle.jpg'], insurancePolicyNumber: 'INS-1234',
      locationId: 'location-1', make: 'Hyundai', manufacturingYear: '2024', maximumRentalDays: '2',
      minimumRentalDays: '3', model: 'Creta', pricePerDay: '2499', registrationCertificateNumber: 'RC-1234',
      registrationNumber: 'KA01AB1234', state: 'Karnataka',
    });

    expect(result.success).toBe(false);
    expect(result.error.issues.map((issue) => issue.message)).toContain('Maximum days cannot be less than minimum days');
  });

  it('uses live host APIs for dashboard, drafts, availability, and booking decisions', () => {
    hostsApi.dashboard();
    hostsApi.listBookings();
    vehiclesApi.createDraft({ make: 'Hyundai' });
    vehiclesApi.updateDraft('vehicle-1', { model: 'Creta' });
    vehiclesApi.createAvailabilityBlock('vehicle-1', { startsAt: '2026-10-20', endsAt: '2026-10-22' });
    vehiclesApi.createPricingRule('vehicle-1', { pricePerDay: 2800, ruleType: 'weekend' });
    vehiclesApi.pause('vehicle-1');
    vehiclesApi.resume('vehicle-1');
    vehiclesApi.submit('vehicle-1');
    bookingsApi.approve('booking-1');
    bookingsApi.reject('booking-1', { reason: 'unavailable' });

    expect(mockApiRequest).toHaveBeenNthCalledWith(1, { method: 'GET', url: '/hosts/me/dashboard' });
    expect(mockApiRequest).toHaveBeenNthCalledWith(2, { method: 'GET', url: '/hosts/me/bookings' });
    expect(mockApiRequest).toHaveBeenNthCalledWith(3, expect.objectContaining({ method: 'POST', url: '/vehicles' }));
    expect(mockApiRequest).toHaveBeenNthCalledWith(5, expect.objectContaining({ method: 'POST', url: '/vehicles/vehicle-1/blocks' }));
    expect(mockApiRequest).toHaveBeenNthCalledWith(9, { method: 'POST', url: '/vehicles/vehicle-1/submit' });
    expect(mockApiRequest).toHaveBeenNthCalledWith(10, expect.objectContaining({ method: 'POST', url: '/bookings/booking-1/approve' }));
    expect(mockApiRequest).toHaveBeenNthCalledWith(11, expect.objectContaining({ method: 'POST', url: '/bookings/booking-1/reject' }));
  });
});
