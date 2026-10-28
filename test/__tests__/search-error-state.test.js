const { getSearchErrorState } = require('@/features/customer/utils/search-error-state');

describe('search error state', () => {
  const originalNavigator = global.navigator;

  afterEach(() => {
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: originalNavigator,
    });
  });

  it('shows a connection-specific error while offline', () => {
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: { onLine: false },
    });

    expect(getSearchErrorState(new Error('Network Error'))).toMatchObject({
      title: 'No Internet Connection',
    });
  });

  it('keeps successful empty results separate from API failures', () => {
    Object.defineProperty(global, 'navigator', {
      configurable: true,
      value: { onLine: true },
    });

    expect(getSearchErrorState(new Error('Request failed with status code 500'))).toMatchObject({
      title: 'Unable to Load Cars',
    });
  });
});
