import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api/client';
import { useWebSocket } from './useWebSocket';
import { useChatStore } from '../store/chatStore';
import type { ChatSession, TranscriptLine } from '../types/claude';
import type { CreateChatSessionRequest, StartTurnRequest, StartTurnResponse } from '../types/api';

// Queries
export function useChatSessions() {
  return useQuery<ChatSession[]>({
    queryKey: ['chat-sessions'],
    queryFn: () => api.get('/chat/sessions'),
  });
}

export function useChatSession(id: string | null) {
  return useQuery<ChatSession>({
    queryKey: ['chat-session', id],
    queryFn: () => api.get(`/chat/sessions/${id}`),
    enabled: !!id,
  });
}

// Mutations
export function useCreateChatSession() {
  const queryClient = useQueryClient();
  const openTab = useChatStore(s => s.openTab);

  return useMutation({
    mutationFn: (data: CreateChatSessionRequest) =>
      api.post<{ sessionId: string; session: ChatSession; turnId?: string; title: string }>('/chat/sessions', data),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
      openTab(result.sessionId, result.title);
    },
  });
}

export function useStartTurn() {
  const queryClient = useQueryClient();
  const setStreaming = useChatStore(s => s.setStreaming);
  const setActiveTurn = useChatStore(s => s.setActiveTurn);

  return useMutation({
    mutationFn: ({ sessionId, text, model, effort }: { sessionId: string; text: string; model?: string; effort?: string }) =>
      api.post<StartTurnResponse>(`/chat/sessions/${sessionId}/turn`, { text, model, effort }),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['chat-session', result.sessionId] });
      setStreaming(true);
      setActiveTurn(result.turnId);
    },
  });
}

// Chat transcript line types for the UI
export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  timestamp: string;
  thinking?: string;
  toolCalls?: Array<{ name: string; input: unknown }>;
  toolResults?: Array<{ id: string; content: unknown }>;
  isStreaming?: boolean;
}

/**
 * Parse transcript lines into chat messages for display
 */
export function parseTranscriptLines(lines: TranscriptLine[]): ChatMessage[] {
  const messages: ChatMessage[] = [];
  let currentAssistant: ChatMessage | null = null;

  for (const line of lines) {
    if (line.type === 'user' && line.message?.content) {
      const text = line.message.content
        .filter((c): c is { type: 'text'; text: string } => c.type === 'text')
        .map(c => c.text)
        .join('\n');
      messages.push({
        id: line.uuid,
        role: 'user',
        text,
        timestamp: line.timestamp,
      });
    } else if (line.type === 'assistant' && line.message?.content) {
      currentAssistant = {
        id: line.uuid,
        role: 'assistant',
        text: '',
        timestamp: line.timestamp,
        thinking: '',
        toolCalls: [],
        toolResults: [],
      };

      for (const block of line.message.content) {
        if (block.type === 'text') {
          currentAssistant.text += block.text;
        } else if (block.type === 'thinking') {
          currentAssistant.thinking = (currentAssistant.thinking || '') + block.thinking;
        } else if (block.type === 'tool_use') {
          currentAssistant.toolCalls?.push({ name: block.name, input: block.input });
        } else if (block.type === 'tool_result') {
          currentAssistant.toolResults?.push({ id: block.tool_use_id, content: block.content });
        }
      }
      messages.push(currentAssistant);
    }
  }

  return messages;
}

/**
 * Hook for streaming chat via WebSocket
 */
export function useChatWebSocket(sessionId: string | null) {
  const { subscribe, send } = useWebSocket();
  const [streamLines, setStreamLines] = useState<TranscriptLine[]>([]);
  const [isDone, setIsDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const queryClient = useQueryClient();
  const linesRef = useRef<TranscriptLine[]>([]);

  const handleOutput = useCallback((payload: { sessionId: string; turnId: string; line: TranscriptLine }) => {
    if (payload.sessionId === sessionId) {
      linesRef.current = [...linesRef.current, payload.line];
      setStreamLines([...linesRef.current]);
      setError(null);
    }
  }, [sessionId]);

  const handleDone = useCallback((payload: { sessionId: string; turnId: string }) => {
    if (payload.sessionId === sessionId) {
      setIsDone(true);
      useChatStore.getState().setStreaming(false);
      useChatStore.getState().setActiveTurn(null);
      // Refresh session data
      queryClient.invalidateQueries({ queryKey: ['chat-session', sessionId] });
      queryClient.invalidateQueries({ queryKey: ['chat-sessions'] });
    }
  }, [sessionId, queryClient]);

  const handleError = useCallback((payload: { sessionId: string; error: string }) => {
    if (payload.sessionId === sessionId) {
      setError(payload.error);
      useChatStore.getState().setStreaming(false);
      useChatStore.getState().setActiveTurn(null);
    }
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    // Reset state when session changes
    linesRef.current = [];
    setStreamLines([]);
    setIsDone(false);
    setError(null);

    const unsub1 = subscribe('chat:output', handleOutput);
    const unsub2 = subscribe('chat:done', handleDone);
    const unsub3 = subscribe('chat:error', handleError);

    return () => {
      unsub1();
      unsub2();
      unsub3();
    };
  }, [sessionId, subscribe, handleOutput, handleDone, handleError]);

  const sendInput = useCallback((text: string, turnId: string) => {
    send({ type: 'chat:input', sessionId: sessionId!, turnId, text });
  }, [sessionId, send]);

  return {
    streamLines,
    messages: parseTranscriptLines(streamLines),
    isDone,
    error,
    sendInput,
    clear: () => {
      linesRef.current = [];
      setStreamLines([]);
      setIsDone(false);
      setError(null);
    },
  };
}
