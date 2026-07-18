import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface ChatTab {
  sessionId: string;
  title: string;
}

interface ChatState {
  tabs: ChatTab[];
  activeSessionId: string | null;
  isStreaming: boolean;
  activeTurnId: string | null;
  setTabs: (tabs: ChatTab[]) => void;
  openTab: (sessionId: string, title: string) => void;
  closeTab: (sessionId: string) => void;
  setActiveSession: (sessionId: string | null) => void;
  setStreaming: (streaming: boolean) => void;
  setActiveTurn: (turnId: string | null) => void;
}

export const useChatStore = create<ChatState>()(
  persist(
    (set) => ({
      tabs: [],
      activeSessionId: null,
      isStreaming: false,
      activeTurnId: null,

      setTabs: (tabs) => set({ tabs }),
      openTab: (sessionId, title) =>
        set((state) => {
          const exists = state.tabs.find(t => t.sessionId === sessionId);
          if (exists) return { activeSessionId: sessionId };
          return {
            tabs: [...state.tabs, { sessionId, title }],
            activeSessionId: sessionId,
          };
        }),
      closeTab: (sessionId) =>
        set((state) => {
          const tabs = state.tabs.filter(t => t.sessionId !== sessionId);
          // If closing active tab, switch to last tab or null
          const activeSessionId = state.activeSessionId === sessionId
            ? (tabs[tabs.length - 1]?.sessionId ?? null)
            : state.activeSessionId;
          return { tabs, activeSessionId };
        }),
      setActiveSession: (sessionId) => set({ activeSessionId: sessionId }),
      setStreaming: (streaming) => set({ isStreaming: streaming }),
      setActiveTurn: (turnId) => set({ activeTurnId: turnId }),
    }),
    {
      name: 'claude-desk-chat',
      partialize: (state) => ({ tabs: state.tabs, activeSessionId: state.activeSessionId }),
    }
  )
);
