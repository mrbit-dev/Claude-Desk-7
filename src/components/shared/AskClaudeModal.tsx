import { useState, useEffect, useRef, useCallback } from 'react';
import { X, Send, Bot, Terminal } from 'lucide-react';
import { useWebSocket } from '../../hooks/useWebSocket';
import clsx from 'clsx';

interface AskClaudeModalProps {
  open: boolean;
  onClose: () => void;
}

export function AskClaudeModal({ open, onClose }: AskClaudeModalProps) {
  const { subscribe, send } = useWebSocket();
  const [prompt, setPrompt] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Subscribe to launch events
  useEffect(() => {
    if (!open) {
      setOutput([]);
      setStatus('idle');
      setSessionId(null);
      return;
    }

    const unsubOutput = subscribe('launch:output', (event: any) => {
      setOutput(prev => [...prev, event.text]);
    });
    const unsubDone = subscribe('launch:done', (event: any) => {
      setStatus(event.exitCode === 0 ? 'done' : 'error');
    });
    const unsubError = subscribe('launch:error', (event: any) => {
      setOutput(prev => [...prev, `Error: ${event.error}`]);
      setStatus('error');
    });

    // Focus input when modal opens
    setTimeout(() => inputRef.current?.focus(), 100);

    return () => {
      unsubOutput();
      unsubDone();
      unsubError();
    };
  }, [open, subscribe]);

  // Auto scroll output
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleSend = useCallback(async () => {
    if (!prompt.trim() || status === 'running') return;

    const p = prompt;
    setPrompt('');
    setOutput([]);
    setStatus('running');

    try {
      const response = await fetch('/api/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: p }),
      });

      if (!response.ok) throw new Error('Launch failed');
      const data = await response.json();
      setSessionId(data.sessionId);
      send({ type: 'subscribe:launch', sessionId: data.sessionId });
    } catch (err: any) {
      setOutput([`Failed: ${err.message}`]);
      setStatus('error');
    }
  }, [prompt, status, send]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') {
      onClose();
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-2xl mx-4 rounded-xl border border-claude-700 bg-claude-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-claude-800 px-4 py-3">
          <div className="flex items-center gap-2">
            <Bot className="h-5 w-5 text-accent" />
            <span className="text-sm font-semibold text-gray-200">Ask Claude</span>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-gray-500 hover:bg-claude-800 hover:text-gray-300 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Output area */}
        {(status === 'running' || status === 'done' || status === 'error') && (
          <div
            ref={outputRef}
            className="terminal-output max-h-64 overflow-y-auto bg-claude-950 p-4 border-b border-claude-800 space-y-1"
          >
            {output.map((line, i) => (
              <p key={i} className={clsx(
                'text-sm whitespace-pre-wrap break-all',
                status === 'error' && i === output.length - 1 ? 'text-red-400' : 'text-gray-300'
              )}>
                {line}
              </p>
            ))}
            {status === 'running' && (
              <span className="inline-block w-2 h-4 bg-gray-500 animate-pulse" />
            )}
            {status === 'done' && (
              <p className="text-xs text-gray-600 italic mt-2">Completed</p>
            )}
          </div>
        )}

        {/* Input area */}
        <div className="p-4">
          <div className="relative">
            <textarea
              ref={inputRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask Claude anything... (Enter to send, Shift+Enter for new line, Esc to close)"
              rows={3}
              className="w-full rounded-lg border border-claude-700 bg-claude-950 p-3 pr-12 text-sm text-gray-200 placeholder-gray-600 resize-none focus:border-accent focus:outline-none"
              disabled={status === 'running'}
            />
            <button
              onClick={handleSend}
              disabled={!prompt.trim() || status === 'running'}
              className="absolute bottom-3 right-3 rounded-lg p-1.5 text-gray-500 hover:text-accent hover:bg-claude-800 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Send className="h-4 w-4" />
            </button>
          </div>
          <p className="mt-2 text-[10px] text-gray-700 flex items-center gap-2">
            <Terminal className="h-3 w-3" />
            Runs via <code className="text-accent">claude --print</code> · Output streams in real-time
          </p>
        </div>
      </div>
    </div>
  );
}
