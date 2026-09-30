const {
  readSearchRouteState,
  toSearchRouteParams,
} = require('../search-route-state');

describe('search route state', () => {
  it('round trips non-sensitive search criteria, filters, and sort', () => {
    const route = toSearchRouteParams({
      locationId: 'bengaluru-1',
      locationName: 'Indiranagar',
      locationCity: 'Bengaluru',
      pickupDateTime: '2026-10-01T10:00:00.000Z',
      returnDateTime: '2026-10-03T10:00:00.000Z',
      filters: {
        vehicleType: 'suv',
        transmission: 'automatic',
        fuelType: 'electric',
        minSeats: 5,
        minPrice: 2500,
        maxPrice: 5000,
      },
      sort: 'rating',
    });

    expect(readSearchRouteState(route)).toEqual({
      locationId: 'bengaluru-1',
      locationName: 'Indiranagar',
      locationCity: 'Bengaluru',
      pickupDateTime: '2026-10-01T10:00:00.000Z',
      returnDateTime: '2026-10-03T10:00:00.000Z',
      filters: {
        vehicleType: 'suv',
        transmission: 'automatic',
        fuelType: 'electric',
        minSeats: 5,
        minPrice: 2500,
        maxPrice: 5000,
      },
      sort: 'rating',
    });
  });

  it('falls back safely for unsupported sort values and invalid numeric filters', () => {
    expect(
      readSearchRouteState({
        sort: 'untrusted-value',
        minSeats: '-1',
        minPrice: 'not-a-number',
      }),
    ).toMatchObject({
      filters: {},
      sort: 'recommended',
    });

    expect(readSearchRouteState(toSearchRouteParams({
      filters: {},
      sort: 'recommended',
    }))).toMatchObject({
      filters: {},
      sort: 'recommended',
    });
  });
});
