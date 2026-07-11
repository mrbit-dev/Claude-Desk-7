import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { ClaudeSettings } from '../types/claude';

export function useSettings() {
  return useQuery<ClaudeSettings>({
    queryKey: ['settings'],
    queryFn: () => api.get('/settings'),
    refetchInterval: 30000,
  });
}

export function useUpdateSettings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (settings: Partial<ClaudeSettings>) =>
      api.put('/settings', settings),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    },
  });
}
