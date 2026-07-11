import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { SessionSummary, TranscriptLine } from '../types/claude';
import { TranscriptResponse } from '../types/api';

export function useSessions() {
  return useQuery<SessionSummary[]>({
    queryKey: ['sessions'],
    queryFn: () => api.get('/sessions'),
    staleTime: 15000,
    refetchInterval: 30000,
  });
}

export function useSession(id: string) {
  return useQuery<SessionSummary>({
    queryKey: ['sessions', id],
    queryFn: () => api.get(`/sessions/${encodeURIComponent(id)}`),
    enabled: !!id,
  });
}

export function useTranscript(sessionId: string, limit?: number, offset?: number) {
  const params = new URLSearchParams();
  if (limit) params.set('limit', limit.toString());
  if (offset) params.set('offset', offset.toString());
  const qs = params.toString();

  return useQuery<TranscriptResponse>({
    queryKey: ['transcript', sessionId, limit, offset],
    queryFn: () => api.get(`/sessions/${encodeURIComponent(sessionId)}/transcript${qs ? '?' + qs : ''}`),
    enabled: !!sessionId,
  });
}

export function useStopSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      api.post(`/sessions/${encodeURIComponent(sessionId)}/stop`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}

export function useDeleteSession() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (sessionId: string) =>
      api.delete(`/sessions/${encodeURIComponent(sessionId)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    },
  });
}
