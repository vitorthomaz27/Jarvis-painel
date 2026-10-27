'use client';
import { useQuery } from '@tanstack/react-query';
import { api } from './api';
import type { Business, Me, Overview } from './types';

export const useMe = () => useQuery({ queryKey: ['me'], queryFn: () => api<Me>('/auth/me'), staleTime: 60_000 });
export const useBusiness = (bid: string) => useQuery({ queryKey: ['business', bid], queryFn: () => api<Business>(`/businesses/${bid}`), enabled: !!bid });
export const useOverview = (bid: string) => useQuery({ queryKey: ['overview', bid], queryFn: () => api<Overview>(`/businesses/${bid}/overview?days=30`), refetchInterval: 60_000, enabled: !!bid });

export function useRole(bid: string) {
  const me = useMe().data;
  if (!me) return null;
  if (me.isSuperAdmin) return 'OWNER' as const;
  return me.businesses.find((b) => b.id === bid)?.role ?? null;
}
