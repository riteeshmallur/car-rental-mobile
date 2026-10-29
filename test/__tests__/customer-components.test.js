const React = require('react');
const { fireEvent, render } = require('@testing-library/react-native');

const { BottomNavigation } = require('@/features/customer/components/bottom-navigation');
const { CarCard } = require('@/features/customer/components/car-card');
const { CachedVehicleImage } = require('@/features/customer/components/cached-vehicle-image');
const { RentalSearchCard } = require('@/features/customer/components/rental-search-card');
const { HomeCategorySection } = require('@/features/home/components/home-category-section');
const { HomeIntentCarousel } = require('@/features/home/components/home-intent-carousel');
const {
  FilterSheet,
  SortSheet,
  StateMessage,
} = require('@/features/customer/screens/search-results-screen');
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
        isSearchEnabled: true,
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
    expect(screen.getByText('Indiranagar')).toBeTruthy();
    expect(screen.getByText('Bengaluru')).toBeTruthy();
  });

  it('keeps Search Cars disabled until a complete valid search is supplied', () => {
    const onSearch = jest.fn();
    const screen = render(
      React.createElement(RentalSearchCard, {
        isSearchEnabled: false,
        location: null,
        onDateTimeFieldPress: jest.fn(),
        onLocationPress: jest.fn(),
        onSearch,
        rentalWindow,
      }),
    );

    const searchButton = screen.getByLabelText('Search available cars');
    fireEvent.press(searchButton);

    expect(searchButton.props.accessibilityState.disabled).toBe(true);
    expect(onSearch).not.toHaveBeenCalled();
    expect(screen.getByText('Select pickup location')).toBeTruthy();
  });

  it('provides date and location actions for an empty vehicle search', () => {
    const onChangeDates = jest.fn();
    const onChangeLocation = jest.fn();
    const screen = render(
      React.createElement(StateMessage, {
        actionLabel: 'Change dates',
        body: "We couldn't find any cars for your selected dates and location.",
        onAction: onChangeDates,
        onSecondaryAction: onChangeLocation,
        secondaryActionLabel: 'Change location',
        title: 'No cars available for your dates',
      }),
    );

    fireEvent.press(screen.getByLabelText('Change dates'));
    fireEvent.press(screen.getByLabelText('Change location'));

    expect(onChangeDates).toHaveBeenCalledTimes(1);
    expect(onChangeLocation).toHaveBeenCalledTimes(1);
  });

  it('opens a vehicle detail action from a real vehicle card', () => {
    const onPress = jest.fn();
    const screen = render(React.createElement(CarCard, { car, onPress }));

    fireEvent.press(screen.getByLabelText(/Hyundai Creta/));

    expect(onPress).toHaveBeenCalledTimes(1);
  });

  it('allows Home card copy to wrap instead of truncating it', () => {
    const longCar = {
      ...car,
      make: 'Mercedes-Benz',
      model: 'GLS Grand Edition with Extended Name',
    };
    const carScreen = render(React.createElement(CarCard, { car: longCar }));
    const carouselScreen = render(
      React.createElement(HomeIntentCarousel, {
        intents: [{
          action: 'Explore Now',
          description: 'Premium cars for city drives, weekend escapes and everything in between.',
          filters: {},
          id: 'weekend',
          title: 'Drive More Out of Bengaluru',
        }],
        onIntentPress: jest.fn(),
      }),
    );
    const categoryScreen = render(
      React.createElement(HomeCategorySection, {
        onCategoryPress: jest.fn(),
        onSeeAll: jest.fn(),
      }),
    );

    expect(carScreen.getByText('Mercedes-Benz GLS Grand Edition with Extended Name').props.numberOfLines).toBeUndefined();
    expect(carouselScreen.getByText('Drive More Out of Bengaluru').props.numberOfLines).toBeUndefined();
    expect(categoryScreen.getByText('For every journey').props.numberOfLines).toBeUndefined();
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
      }),
    );

    fireEvent.press(filterScreen.getByLabelText('Car type: SUV'));
    fireEvent.press(filterScreen.getByLabelText('Apply filters'));
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

  it('locks sort controls while a selection is navigating, preventing duplicate or click-through actions', () => {
    const onClose = jest.fn();
    const onSelect = jest.fn();
    const screen = render(
      React.createElement(SortSheet, {
        isApplying: true,
        isVisible: true,
        onClose,
        onSelect,
        selectedSort: 'recommended',
      }),
    );

    const option = screen.getByLabelText('Price high to low');
    fireEvent.press(option);
    fireEvent.press(screen.getByLabelText('Done sorting'));

    expect(option.props.accessibilityState).toMatchObject({ disabled: true });
    expect(onSelect).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
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

    fireEvent.press(screen.getByLabelText('My Bookings'));

    expect(global.__testRouter.replace).toHaveBeenCalledWith('/(customer)/trips');
  });

  it('replaces a failed vehicle image with one stable fallback', () => {
    const onError = jest.fn();
    const screen = render(
      React.createElement(CachedVehicleImage, {
        onError,
        style: { height: 80, width: 120 },
        uri: 'http://localhost:3099/uploads/cars/missing-thumbnail.jpg',
      }),
    );

    fireEvent(screen.UNSAFE_getByType('Image'), 'error');

    expect(onError).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('vehicle-image-fallback')).toBeTruthy();
  });
});
