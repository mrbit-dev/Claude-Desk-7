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

// === MCP Tool hooks ===

import type { MCPTool } from '../types/claude';
import type { MCPToolListResponse, MCPToolCallResponse } from '../types/api';

export function useMCPTools(name: string | null) {
  return useQuery<MCPToolListResponse>({
    queryKey: ['mcp-tools', name],
    queryFn: () => api.get(`/mcp-servers/${encodeURIComponent(name!)}/tools`),
    enabled: !!name,
    staleTime: 60_000, // 1 min cache
  });
}

export function useCallTool() {
  return useMutation({
    mutationFn: ({ serverName, toolName, args }: { serverName: string; toolName: string; args: Record<string, unknown> }) =>
      api.post<MCPToolCallResponse>(`/mcp-servers/${encodeURIComponent(serverName)}/tools/${encodeURIComponent(toolName)}/call`, { args }),
  });
}

// === MCP Log hooks ===

export function useMCPLogs(name: string | null) {
  return useQuery<{ serverName: string; logs: string[] }>({
    queryKey: ['mcp-logs', name],
    queryFn: () => api.get(`/mcp-servers/${encodeURIComponent(name!)}/logs`),
    enabled: !!name,
    refetchInterval: 3_000,
  });
}

export function useClearMCPLogs() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) =>
      api.delete(`/mcp-servers/${encodeURIComponent(name)}/logs`),
    onSuccess: (_, name) => {
      queryClient.invalidateQueries({ queryKey: ['mcp-logs', name] });
    },
  });
}
