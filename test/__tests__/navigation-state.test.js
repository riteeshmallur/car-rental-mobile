const {
  readSearchRouteState,
  searchRouteKey,
  toSearchRouteParams,
} = require('@/features/customer/utils/search-route-state');
const { useBookingFlowStore } = require('@/store/booking-flow-store');
const { useCustomerSearchStore } = require('@/store/customer-search-store');

describe('customer navigation state restoration', () => {
  beforeEach(() => {
    useBookingFlowStore.getState().clear();
    useCustomerSearchStore.setState({
      selectedLocation: null,
      rentalWindow: {
        pickupAt: new Date('2026-10-20T10:00:00.000Z'),
        returnAt: new Date('2026-10-22T18:00:00.000Z'),
      },
    });
  });

  it('preserves the complete search state for Search → Detail → Back', () => {
    const state = {
      filters: { fuelType: 'electric', minSeats: 5, minPrice: 2500 },
      locationCity: 'Bengaluru',
      locationId: 'loc-1',
      locationName: 'Indiranagar',
      pickupDateTime: '2026-10-20T10:00:00.000Z',
      returnDateTime: '2026-10-22T18:00:00.000Z',
      sort: 'rating',
    };
    const detailParams = toSearchRouteParams(state);
    const restored = readSearchRouteState(detailParams);

    expect(restored).toEqual(state);
    expect(searchRouteKey(restored)).toBe(searchRouteKey(state));
  });

  it('keeps booking state separate from search state during a customer-to-host switch', () => {
    const booking = { id: 'booking-1', status: 'PENDING' };
    useBookingFlowStore.getState().setBooking(booking);
    useCustomerSearchStore.getState().setSelectedLocation({
      id: 'loc-1',
      name: 'Indiranagar',
      city: 'Bengaluru',
    });

    expect(useBookingFlowStore.getState().booking).toEqual(booking);
    expect(useCustomerSearchStore.getState().selectedLocation.name).toBe('Indiranagar');

    useBookingFlowStore.getState().clear();
    expect(useCustomerSearchStore.getState().selectedLocation.name).toBe('Indiranagar');
  });
});
