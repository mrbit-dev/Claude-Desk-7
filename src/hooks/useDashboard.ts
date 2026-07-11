import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { DashboardSummary } from '../types/claude';

export function useDashboard() {
  return useQuery<DashboardSummary>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/summary'),
    staleTime: 15000,
    refetchInterval: 30000,
  });
}
