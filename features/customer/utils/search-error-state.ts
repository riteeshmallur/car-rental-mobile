import { isAxiosError } from 'axios';

export type SearchErrorState = {
  body: string;
  title: string;
};

function isBrowserOffline() {
  return typeof navigator !== 'undefined' && navigator.onLine === false;
}

function isNetworkFailure(error: unknown) {
  if (isBrowserOffline()) {
    return true;
  }

  if (isAxiosError(error)) {
    return !error.response || error.code === 'ERR_NETWORK' || error.code === 'ECONNABORTED';
  }

  return error instanceof Error && /network|failed to fetch|timeout/i.test(error.message);
}

export function getSearchErrorState(error: unknown): SearchErrorState {
  if (isNetworkFailure(error)) {
    return {
      title: 'No Internet Connection',
      body: 'Check your connection, then try again. Your search details are still saved.',
    };
  }

  return {
    title: 'Unable to Load Cars',
    body: 'We could not load cars for this search. Please try again.',
  };
}
