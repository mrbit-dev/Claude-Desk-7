import { MessageSquare, Plus, Trash2, Clock } from 'lucide-react';
import { useChatSessions } from '../../hooks/useChat';
import { useChatStore } from '../../store/chatStore';
import { formatRelativeTime } from '../../utils/format';
import clsx from 'clsx';

export function ChatSidebar() {
  const { data: sessions, isLoading } = useChatSessions();
  const { activeSessionId, openTab, closeTab } = useChatStore();
  const onCreateNew = () => {
    // Will be handled by parent
    window.dispatchEvent(new CustomEvent('chat:new'));
  };

  return (
    <div className="flex h-full flex-col border-r border-claude-800 bg-claude-900/50">
      <div className="flex items-center justify-between border-b border-claude-800 px-3 py-2.5">
        <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Chats</h3>
        <button
          onClick={onCreateNew}
          className="rounded-lg p-1 text-gray-500 hover:bg-claude-800 hover:text-gray-300 transition-colors"
          title="New Chat"
        >
          <Plus className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {isLoading && (
          <div className="space-y-2">
            {[1, 2, 3].map(i => (
              <div key={i} className="h-14 animate-pulse rounded-lg bg-claude-800" />
            ))}
          </div>
        )}

        {!isLoading && (!sessions || sessions.length === 0) && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <MessageSquare className="h-8 w-8 text-gray-600 mb-2" />
            <p className="text-xs text-gray-500">No chats yet</p>
            <p className="text-[10px] text-gray-600 mt-1">Start a new conversation</p>
          </div>
        )}

        {sessions?.map(session => (
          <button
            key={session.sessionId}
            onClick={() => openTab(session.sessionId, session.title)}
            className={clsx(
              'w-full rounded-lg px-3 py-2 text-left transition-colors group',
              activeSessionId === session.sessionId
                ? 'bg-accent/10 border border-accent/20'
                : 'hover:bg-claude-800 border border-transparent'
            )}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-xs font-medium text-gray-300 truncate flex-1">{session.title}</p>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  closeTab(session.sessionId);
                }}
                className="opacity-0 group-hover:opacity-100 rounded p-0.5 text-gray-600 hover:text-red-400 transition-all"
                title="Delete"
              >
                <Trash2 className="h-3 w-3" />
              </button>
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <Clock className="h-3 w-3 text-gray-600" />
              <span className="text-[10px] text-gray-600">
                {session.updatedAt ? formatRelativeTime(session.updatedAt) : ''}
              </span>
              <span className="text-[10px] text-gray-700">{session.turns.length} turns</span>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
