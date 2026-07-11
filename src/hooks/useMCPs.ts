import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';
import { MCPServerWithName } from '../types/claude';
import { HealthCheckResponse } from '../types/api';

export function useMCPs() {
  return useQuery<MCPServerWithName[]>({
    queryKey: ['mcps'],
    queryFn: () => api.get('/mcp-servers'),
  });
}

export function useAddMCPServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (server: MCPServerWithName) =>
      api.post('/mcp-servers', server),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcps'] });
    },
  });
}

export function useUpdateMCPServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ name, updates }: { name: string; updates: Partial<MCPServerWithName> }) =>
      api.put(`/mcp-servers/${encodeURIComponent(name)}`, updates),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcps'] });
    },
  });
}

export function useDeleteMCPServer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.delete(`/mcp-servers/${encodeURIComponent(name)}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcps'] });
    },
  });
}

export function useHealthCheck() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.post<HealthCheckResponse>(`/mcp-servers/${encodeURIComponent(name)}/health-check`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcps'] });
    },
  });
}
