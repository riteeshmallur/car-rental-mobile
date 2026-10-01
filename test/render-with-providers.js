const React = require('react');
const { QueryClient, QueryClientProvider } = require('@tanstack/react-query');
const { render } = require('@testing-library/react-native');
const { SafeAreaProvider } = require('react-native-safe-area-context');

function renderWithProviders(ui) {
  const client = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
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
