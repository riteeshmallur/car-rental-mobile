const React = require('react');
const { fireEvent, render } = require('@testing-library/react-native');

const { BottomNavigation } = require('@/features/customer/components/bottom-navigation');
const { CarCard } = require('@/features/customer/components/car-card');
const { RentalSearchCard } = require('@/features/customer/components/rental-search-card');
const { FilterSheet, SortSheet } = require('@/features/customer/screens/search-results-screen');
const { PriceRows } = require('@/features/customer/screens/booking-summary-screen');

const rentalWindow = {
  pickupAt: new Date('2026-10-20T10:00:00.000Z'),
  returnAt: new Date('2026-10-22T18:00:00.000Z'),
};

const car = {
  available: true,
  bookable: true,
  city: 'Bengaluru',
  colour: 'White',
  country: 'India',
  createdAt: '2026-01-01T00:00:00.000Z',
  description: 'Test vehicle',
  doors: 4,
  fuelType: 'petrol',
  id: 'vehicle-1',
  imageUrl: null,
  isSoldOut: false,
  make: 'Hyundai',
  manufacturingYear: 2024,
  maximumRentalDays: null,
  mileageLimitPerDay: 250,
  minimumRentalDays: 1,
  model: 'Creta',
  pricePerDay: '2499',
  registrationNumber: 'KA01AB1234',
  seats: 5,
  securityDeposit: '5000',
  state: 'Karnataka',
  status: 'PUBLISHED',
  transmission: 'automatic',
  updatedAt: '2026-01-01T00:00:00.000Z',
  vehicleType: 'suv',
};

describe('customer home, search, filters, vehicle details, and quote components', () => {
  it('routes each search-card action through its dedicated handler', () => {
    const onDateTimeFieldPress = jest.fn();
    const onLocationPress = jest.fn();
    const onSearch = jest.fn();
    const screen = render(
      React.createElement(RentalSearchCard, {
        location: { id: 'loc-1', name: 'Indiranagar', city: 'Bengaluru' },
        onDateTimeFieldPress,
        onLocationPress,
        onSearch,
        rentalWindow,
      }),
    );

    fireEvent.press(screen.getByLabelText('Pickup location, Indiranagar'));
    fireEvent.press(screen.getByLabelText(/^Pick-up time,/));
    fireEvent.press(screen.getByLabelText('Search available cars'));

    expect(onLocationPress).toHaveBeenCalledTimes(1);
    expect(onDateTimeFieldPress).toHaveBeenCalledWith('pickupTime');
    expect(onSearch).toHaveBeenCalledTimes(1);
  });

  it('opens a vehicle detail action from a real vehicle card', () => {
    const onPress = jest.fn();
    const screen = render(React.createElement(CarCard, { car, onPress }));

    fireEvent.press(screen.getByLabelText(/Hyundai Creta/));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('applies filters and sort choices without mutating the existing state', () => {
    const onApply = jest.fn();
    const onChange = jest.fn();
    const onSelect = jest.fn();
    const filters = { transmission: 'automatic' };
    const filterScreen = render(
      React.createElement(FilterSheet, {
        draftFilters: filters,
        isVisible: true,
        onApply,
        onChange,
        onClose: jest.fn(),
        onReset: jest.fn(),
        resultCount: 4,
      }),
    );

    fireEvent.press(filterScreen.getByLabelText('Car type: SUV'));
    fireEvent.press(filterScreen.getByLabelText('Show 4 cars'));
    expect(onChange).toHaveBeenCalledWith({ transmission: 'automatic', vehicleType: 'suv' });
    expect(onApply).toHaveBeenCalledWith(filters);

    const sortScreen = render(
      React.createElement(SortSheet, {
        isVisible: true,
        onClose: jest.fn(),
        onSelect,
        selectedSort: 'recommended',
      }),
    );
    fireEvent.press(sortScreen.getByLabelText('Rating'));
    expect(onSelect).toHaveBeenCalledWith('rating');
  });

  it('shows a quote breakdown with a total before payment', () => {
    const screen = render(
      React.createElement(PriceRows, {
        rows: [['Base price', '4998'], ['Taxes', '500']],
        total: '5498',
      }),
    );

    expect(screen.getByText('Price breakdown')).toBeTruthy();
    expect(screen.getByText('₹5,498')).toBeTruthy();
  });

  it('navigates between customer tabs without text-only controls', () => {
    global.__testPathname.mockReturnValue('/home');
    const screen = render(React.createElement(BottomNavigation));

    fireEvent.press(screen.getByLabelText('Trips'));

    expect(global.__testRouter.replace).toHaveBeenCalledWith('/(customer)/trips');
  });
});
