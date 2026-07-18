import { MessageSquare, Plus, X } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';
import clsx from 'clsx';

interface ChatTabBarProps {
  onCreateNew: () => void;
}

export function ChatTabBar({ onCreateNew }: ChatTabBarProps) {
  const { tabs, activeSessionId, openTab, closeTab } = useChatStore();

  return (
    <div className="flex items-center border-b border-claude-800 bg-claude-900/30 overflow-x-auto">
      {tabs.map(tab => (
        <div
          key={tab.sessionId}
          onClick={() => openTab(tab.sessionId, tab.title)}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-2 text-xs border-r border-claude-800 cursor-pointer select-none transition-colors whitespace-nowrap',
            activeSessionId === tab.sessionId
              ? 'bg-claude-800/60 text-gray-200 border-b-2 border-b-accent'
              : 'text-gray-500 hover:bg-claude-800/30 hover:text-gray-300'
          )}
        >
          <MessageSquare className="h-3 w-3" />
          <span className="max-w-28 truncate">{tab.title}</span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              closeTab(tab.sessionId);
            }}
            className="rounded p-0.5 hover:bg-claude-700/50 hover:text-red-400 transition-colors ml-1"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}

      <button
        onClick={onCreateNew}
        className="flex items-center gap-1 px-3 py-2 text-xs text-gray-500 hover:text-gray-300 hover:bg-claude-800/30 transition-colors"
      >
        <Plus className="h-3.5 w-3.5" />
        New
      </button>
    </div>
  );
}
