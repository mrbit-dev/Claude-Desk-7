import { useRef, useEffect } from 'react';
import { User, Bot, Wrench, Loader2, ChevronDown, ChevronRight } from 'lucide-react';
import clsx from 'clsx';
import type { ChatMessage } from '../../hooks/useChat';

interface ChatMessageListProps {
  messages: ChatMessage[];
  isStreaming: boolean;
}

function ThinkingBlock({ text }: { text: string }) {
  const [open, setOpen] = useState(false);
  // Need useState
}

import { useState } from 'react';

function ToolCallBlock({ name, input }: { name: string; input: unknown }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-lg border border-yellow-800/30 bg-yellow-900/10">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-1.5 px-2 py-1.5 w-full text-left text-[11px] text-yellow-400 hover:text-yellow-300 transition-colors"
      >
        {open ? <ChevronDown className="h-3 w-3" /> : <ChevronRight className="h-3 w-3" />}
        <Wrench className="h-3 w-3" />
        <span className="font-medium">{name}</span>
      </button>
      {open && (
        <pre className="px-2 pb-2 text-[10px] text-gray-400 overflow-x-auto whitespace-pre-wrap font-mono">
          {JSON.stringify(input, null, 2)}
        </pre>
      )}
    </div>
  );
}

function MessageBubble({ message, isLast }: { message: ChatMessage; isLast: boolean }) {
  const isUser = message.role === 'user';

  return (
    <div className={clsx('flex gap-3', isUser ? 'justify-end' : 'justify-start')}>
      {!isUser && (
        <div className="flex-shrink-0 mt-1">
          <div className="rounded-lg bg-accent/15 p-1.5">
            <Bot className="h-4 w-4 text-accent" />
          </div>
        </div>
      )}

      <div className={clsx('max-w-[80%] space-y-2', isUser && 'order-first')}>
        {/* Text content */}
        {message.text && (
          <div className={clsx(
            'rounded-xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap',
            isUser
              ? 'bg-accent text-white rounded-br-md'
              : 'bg-claude-800/50 text-gray-200 rounded-bl-md border border-claude-700/50'
          )}>
            {message.text}
            {isLast && message.isStreaming && (
              <span className="inline-block w-1.5 h-4 ml-0.5 bg-accent animate-pulse" />
            )}
          </div>
        )}

        {/* Thinking block */}
        {message.thinking && message.thinking.length > 0 && (
          <details className="rounded-lg border border-claude-700 bg-claude-900/50">
            <summary className="flex items-center gap-1.5 px-3 py-2 text-[11px] text-gray-500 cursor-pointer hover:text-gray-400 transition-colors">
              <ChevronRight className="h-3 w-3" />
              Thinking ({message.thinking.length} chars)
            </summary>
            <div className="px-3 pb-2 text-[11px] text-gray-500 italic whitespace-pre-wrap border-t border-claude-800 pt-2">
              {message.thinking}
            </div>
          </details>
        )}

        {/* Tool calls */}
        {message.toolCalls && message.toolCalls.length > 0 && (
          <div className="space-y-1">
            {message.toolCalls.map((tc, i) => (
              <ToolCallBlock key={i} name={tc.name} input={tc.input} />
            ))}
          </div>
        )}
      </div>

      {isUser && (
        <div className="flex-shrink-0 mt-1">
          <div className="rounded-lg bg-accent p-1.5">
            <User className="h-4 w-4 text-white" />
          </div>
        </div>
      )}
    </div>
  );
}

export function ChatMessageList({ messages, isStreaming }: ChatMessageListProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [autoScroll, setAutoScroll] = useState(true);

  const handleScroll = () => {
    if (!scrollRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = scrollRef.current;
    setAutoScroll(scrollHeight - scrollTop - clientHeight < 100);
  };

  useEffect(() => {
    if (autoScroll && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, autoScroll]);

  if (messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <Bot className="h-12 w-12 text-gray-700 mx-auto mb-3" />
          <p className="text-sm text-gray-500">Send a message to start chatting with Claude</p>
          <p className="text-xs text-gray-600 mt-1">I'll remember our conversation context</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      onScroll={handleScroll}
      className="flex-1 overflow-y-auto px-4 py-6 space-y-4"
    >
      {messages.map((msg, i) => (
        <MessageBubble
          key={msg.id}
          message={msg}
          isLast={i === messages.length - 1}
        />
      ))}

      {!autoScroll && messages.length > 0 && (
        <button
          onClick={() => scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })}
          className="fixed bottom-24 left-1/2 -translate-x-1/2 rounded-full bg-accent px-4 py-1.5 text-xs text-white shadow-lg hover:bg-accent-dark transition-colors"
        >
          New messages ↓
        </button>
      )}

      {isStreaming && messages.length === 0 && (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 text-accent animate-spin" />
        </div>
      )}
    </div>
  );
}
