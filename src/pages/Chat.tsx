import { useCallback, useEffect } from 'react';
import { useChatStore } from '../store/chatStore';
import { useChatSession, useChatWebSocket, useCreateChatSession, useStartTurn, type ChatMessage } from '../hooks/useChat';
import { ChatSidebar } from '../components/chat/ChatSidebar';
import { ChatTabBar } from '../components/chat/ChatTabBar';
import { ChatMessageList } from '../components/chat/ChatMessageList';
import { ChatInput } from '../components/chat/ChatInput';
import { api } from '../api/client';

export default function ChatPage() {
  const { tabs, activeSessionId, openTab, isStreaming, setStreaming, setActiveTurn, closeTab } = useChatStore();
  const { data: activeSession } = useChatSession(activeSessionId);
  const createSession = useCreateChatSession();
  const startTurn = useStartTurn();
  const { messages, streamLines, isDone, error, clear } = useChatWebSocket(activeSessionId);

  // Merge history messages with stream messages
  const allMessages: ChatMessage[] = [];

  // Load previous turns' messages from session data
  if (activeSession) {
    // We could load transcript files for previous turns here
    // For now, just show that history exists
    const prevTurns = activeSession.turns.filter(t => t.completedAt);
    if (prevTurns.length > 0 && streamLines.length === 0) {
      allMessages.push({
        id: 'history-note',
        role: 'assistant',
        text: `📋 This conversation has ${prevTurns.length} previous turn(s). Continue the conversation below.`,
        timestamp: new Date().toISOString(),
      });
    }
  }

  // Add streaming messages
  allMessages.push(...messages);

  // Handle "new chat" event from sidebar
  useEffect(() => {
    const handler = () => handleCreateNew();
    window.addEventListener('chat:new', handler);
    return () => window.removeEventListener('chat:new', handler);
  }, []);

  const handleCreateNew = useCallback(async () => {
    try {
      const result = await createSession.mutateAsync({});
      clear();
      setActiveTurn(null);
    } catch {
      // error handled by mutation
    }
  }, [createSession, clear, setActiveTurn]);

  const handleSend = useCallback(async (text: string) => {
    if (!activeSessionId) {
      // Auto-create session on first message
      try {
        const result = await createSession.mutateAsync({ initialPrompt: text });
        // Turn is started automatically by the server
        clear();
      } catch {
        // error handled
      }
      return;
    }

    try {
      await startTurn.mutateAsync({ sessionId: activeSessionId, text });
    } catch {
      // error handled by mutation
    }
  }, [activeSessionId, createSession, startTurn, clear]);

  const handleCancel = useCallback(() => {
    if (activeSessionId) {
      api.post(`/chat/sessions/${activeSessionId}/cancel`, {}).catch(() => {});
      setStreaming(false);
      setActiveTurn(null);
    }
  }, [activeSessionId, setStreaming, setActiveTurn]);

  const handleSelectSession = useCallback((sessionId: string) => {
    openTab(sessionId, '');
    clear();
  }, [openTab, clear]);

  return (
    <div className="flex h-[calc(100vh-3.5rem)] -m-6">
      {/* Sidebar */}
      <div className="hidden lg:flex w-64 flex-shrink-0">
        <ChatSidebar />
      </div>

      {/* Main chat area */}
      <div className="flex flex-1 flex-col min-w-0">
        <ChatTabBar onCreateNew={handleCreateNew} />

        {/* Messages */}
        <ChatMessageList
          messages={allMessages}
          isStreaming={isStreaming}
        />

        {/* Error banner */}
        {error && (
          <div className="mx-4 mb-2 rounded-lg bg-red-900/20 border border-red-800/30 px-3 py-2">
            <p className="text-xs text-red-400">{error}</p>
          </div>
        )}

        {/* Input */}
        <ChatInput
          onSend={handleSend}
          onCancel={handleCancel}
          disabled={createSession.isPending || startTurn.isPending}
        />

        {/* Loading indicator for session creation */}
        {(createSession.isPending) && (
          <div className="absolute inset-0 bg-claude-950/50 flex items-center justify-center">
            <div className="rounded-xl bg-claude-900 border border-claude-800 p-6 text-center">
              <p className="text-sm text-gray-400">Creating new conversation...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
