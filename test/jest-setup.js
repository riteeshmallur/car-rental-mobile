const mockRouter = {
  back: jest.fn(),
  canDismiss: jest.fn(() => false),
  canGoBack: jest.fn(() => false),
  dismissAll: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
  setParams: jest.fn(),
};

const mockUseLocalSearchParams = jest.fn(() => ({}));
const mockUsePathname = jest.fn(() => '/home');
const mockNavigation = {
  addListener: jest.fn(() => jest.fn()),
};
const mockUseFocusEffect = jest.fn((effect) => {
  require('react').useEffect(effect, [effect]);
});

jest.mock('expo-router', () => ({
  Redirect: ({ href }) => require('react').createElement('Redirect', { href }),
  Stack: Object.assign(
    ({ children }) => require('react').createElement(require('react').Fragment, null, children),
    { Screen: () => null },
  ),
  router: mockRouter,
  useFocusEffect: mockUseFocusEffect,
  useLocalSearchParams: mockUseLocalSearchParams,
  useNavigation: () => mockNavigation,
  usePathname: mockUsePathname,
}));

jest.mock('react-native-safe-area-context', () => ({
  SafeAreaProvider: ({ children }) => require('react').createElement(require('react-native').View, null, children),
  SafeAreaView: ({ children, ...props }) => require('react').createElement(require('react-native').View, props, children),
  useSafeAreaInsets: () => ({ bottom: 0, left: 0, right: 0, top: 0 }),
}));

jest.mock('expo-image', () => ({
  Image: ({ children, ...props }) => require('react').createElement('Image', props, children),
}));

jest.mock('lucide-react-native', () =>
  new Proxy({}, { get: () => () => null }),
);

jest.mock('@react-native-community/datetimepicker', () => () => null);

jest.mock('react-native-razorpay', () => ({
  __esModule: true,
  default: { open: jest.fn() },
}));

global.__testRouter = mockRouter;
global.__testRouteParams = mockUseLocalSearchParams;
global.__testPathname = mockUsePathname;
global.__testNavigation = mockNavigation;

beforeEach(() => {
  Object.values(mockRouter).forEach((value) => {
    if (typeof value === 'function' && value.mockClear) value.mockClear();
  });
  mockRouter.canDismiss.mockReturnValue(false);
  mockRouter.canGoBack.mockReturnValue(false);
  mockUseLocalSearchParams.mockReturnValue({});
  mockUsePathname.mockReturnValue('/home');
  mockNavigation.addListener.mockClear();
  mockNavigation.addListener.mockImplementation(() => jest.fn());
});
