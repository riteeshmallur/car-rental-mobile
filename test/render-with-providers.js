const React = require('react');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
const { render } = require('@testing-library/react-native');
const { SafeAreaProvider } = require('react-native-safe-area-context');

function renderWithProviders(ui) {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      // React Query otherwise schedules a five-minute cache GC timer after
      // test queries unmount, which keeps Jest's event loop alive.
      queries: { gcTime: Infinity, retry: false },
    },
  });

  return render(
    React.createElement(
      SafeAreaProvider,
      null,
      React.createElement(QueryClientProvider, { client }, ui),
    ),
  );
}

module.exports = { renderWithProviders };
