import { useQuery } from '@tanstack/react-query';

import { hostsApi } from '@/services/hosts/hosts-api';

export const hostStatusQueryKey = ['hosts', 'me', 'status'] as const;

/** The single backend source of truth for customer and host entry cards. */
export function useHostStatus() {
  return useQuery({
    queryKey: hostStatusQueryKey,
    queryFn: hostsApi.status,
    staleTime: 15_000,
  });
}
