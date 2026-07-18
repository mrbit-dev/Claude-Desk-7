import { useState, useRef, useEffect } from 'react';
import { Send, Square, Loader2 } from 'lucide-react';
import { useChatStore } from '../../store/chatStore';

interface ChatInputProps {
  onSend: (text: string) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function ChatInput({ onSend, onCancel, disabled }: ChatInputProps) {
  const [text, setText] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const isStreaming = useChatStore(s => s.isStreaming);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = Math.min(textareaRef.current.scrollHeight, 200) + 'px';
    }
  }, [text]);

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  const handleSubmit = () => {
    const trimmed = text.trim();
    if (!trimmed || isStreaming || disabled) return;
    onSend(trimmed);
    setText('');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  return (
    <div className="border-t border-claude-800 bg-claude-900/80 px-4 py-3">
      <div className="flex items-end gap-2 max-w-4xl mx-auto">
        <div className="flex-1 relative">
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={isStreaming ? 'Waiting for response...' : 'Ask Claude anything...'}
            disabled={isStreaming || disabled}
            rows={1}
            className="w-full rounded-xl border border-claude-700 bg-claude-950 px-4 py-2.5 text-sm text-gray-200 placeholder-gray-600 resize-none focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/30 disabled:opacity-50 transition-colors"
          />
        </div>

        {isStreaming ? (
          <button
            onClick={onCancel}
            className="flex-shrink-0 rounded-xl border border-red-800/50 bg-red-900/20 px-3 py-2.5 text-red-400 hover:bg-red-900/40 hover:text-red-300 transition-colors"
            title="Stop"
          >
            <Square className="h-4 w-4" />
          </button>
        ) : (
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || disabled}
            className="flex-shrink-0 rounded-xl bg-accent px-3 py-2.5 text-white hover:bg-accent-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            title="Send"
          >
            {disabled ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        )}
      </div>

      <div className="flex items-center justify-between max-w-4xl mx-auto mt-1.5 px-1">
        <p className="text-[10px] text-gray-700">
          {isStreaming
            ? 'Claude is generating a response...'
            : 'Enter to send · Shift+Enter for new line'}
        </p>
        {text.length > 0 && (
          <p className="text-[10px] text-gray-700">{text.length} chars</p>
        )}
      </div>
    </div>
  );
}
