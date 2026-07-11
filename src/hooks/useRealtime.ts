import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useWebSocket } from './useWebSocket';

/**
 * Automatically invalidate dashboard query when settings/sessions change via WebSocket.
 * Call this once in a top-level component.
 */
export function useRealtimeInvalidation() {
  const queryClient = useQueryClient();
  const { subscribe } = useWebSocket();

  useEffect(() => {
    const unsubSettings = subscribe('settings:changed', () => {
      queryClient.invalidateQueries({ queryKey: ['settings'] });
    });

    const unsubSession = subscribe('session:updated', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    });

    const unsubSessionCreated = subscribe('session:created', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    });

    const unsubSessionDeleted = subscribe('session:deleted', () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['sessions'] });
    });

    const unsubAgentUpdate = subscribe('agent:update', () => {
      queryClient.invalidateQueries({ queryKey: ['agents'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
    });

    return () => {
      unsubSettings();
      unsubSession();
      unsubSessionCreated();
      unsubSessionDeleted();
      unsubAgentUpdate();
    };
  }, [queryClient, subscribe]);
}
