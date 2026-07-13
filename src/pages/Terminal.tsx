import { useState, useRef, useEffect, useCallback } from 'react';
import { Terminal as TerminalIcon, Send, Trash2, Bot, Loader2 } from 'lucide-react';
import { useWebSocket } from '../hooks/useWebSocket';
import { v4 as uuidv4 } from 'uuid';
import clsx from 'clsx';

interface TerminalLine {
  id: string;
  text: string;
  type: 'input' | 'output' | 'error' | 'system' | 'prompt';
}

export default function TerminalPage() {
  const { subscribe, send } = useWebSocket();
  const [lines, setLines] = useState<TerminalLine[]>([
    { id: 'welcome', text: 'Claude Desk Terminal — Type a message and press Enter to chat with Claude.', type: 'system' },
    { id: 'welcome2', text: 'Use --print for non-interactive mode, or just type naturally.', type: 'system' },
  ]);
  const [input, setInput] = useState('');
  const [status, setStatus] = useState<'idle' | 'running' | 'done' | 'error'>('idle');
  const [sessionId, setSessionId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Auto scroll
  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  // WS subscriptions
  useEffect(() => {
    const unsubOutput = subscribe('launch:output', (event: any) => {
      let text = event.text || '';
      // Try to parse JSON and extract the actual response text
      try {
        const parsed = JSON.parse(text);
        if (parsed.result) {
          text = parsed.result;
        } else if (parsed.text) {
          text = parsed.text;
        } else if (parsed.message?.content?.[0]?.text) {
          text = parsed.message.content[0].text;
        }
        // Skip JSON noise
        if (text.startsWith('{') || text.startsWith('[')) return;
      } catch { /* not JSON, show as-is */ }
      if (text.trim()) {
        setLines(prev => [...prev, { id: uuidv4(), text, type: 'output' }]);
      }
    });
    const unsubDone = subscribe('launch:done', (event: any) => {
      const text = event.result || `\nDone (${(event.duration / 1000).toFixed(1)}s)`;
      setLines(prev => [...prev, { id: uuidv4(), text, type: 'system' }]);
      setStatus('done');
      setInput('');
    });
    const unsubError = subscribe('launch:error', (event: any) => {
      setLines(prev => [...prev, { id: uuidv4(), text: event.error, type: 'error' }]);
      setStatus('error');
    });

    return () => { unsubOutput(); unsubDone(); unsubError(); };
  }, [subscribe]);

  const handleSend = useCallback(async () => {
    const cmd = input.trim();
    if (!cmd || status === 'running') return;

    setLines(prev => [...prev, { id: uuidv4(), text: `$ ${cmd}`, type: 'input' }]);
    setStatus('running');

    try {
      const res = await fetch('/api/launch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: cmd }),
      });
      if (!res.ok) throw new Error('Launch failed');
      const data = await res.json();
      setSessionId(data.sessionId);
      send({ type: 'subscribe:launch', sessionId: data.sessionId });
    } catch (err: any) {
      setLines(prev => [...prev, { id: uuidv4(), text: `Failed: ${err.message}`, type: 'error' }]);
      setStatus('error');
    }
  }, [input, status, send]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = () => {
    setLines([
      { id: 'clear1', text: 'Terminal cleared.', type: 'system' },
      { id: 'clear2', text: 'Type a message to chat with Claude.', type: 'system' },
    ]);
    setStatus('idle');
    setSessionId(null);
  };

  return (
    <div className="h-full flex flex-col space-y-4">
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-claude-800 p-2">
            <TerminalIcon className="h-5 w-5 text-accent" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-gray-100">Claude Terminal</h2>
            <p className="text-xs text-gray-500">Interactive Claude Code session in your browser</p>
          </div>
        </div>
        <button onClick={handleClear} className="flex items-center gap-1.5 rounded-lg border border-claude-700 px-3 py-1.5 text-xs text-gray-500 hover:bg-claude-800 hover:text-gray-300 transition-colors">
          <Trash2 className="h-3.5 w-3.5" /> Clear
        </button>
      </div>

      {/* Terminal */}
      <div className="flex-1 rounded-xl border border-claude-800 bg-claude-950 overflow-hidden flex flex-col">
        {/* Output */}
        <div ref={containerRef} className="flex-1 overflow-y-auto p-4 font-mono text-sm space-y-1">
          {lines.map((line) => (
            <div key={line.id} className={clsx(
              'whitespace-pre-wrap break-all',
              line.type === 'input' && 'text-green-400',
              line.type === 'output' && 'text-gray-300',
              line.type === 'error' && 'text-red-400',
              line.type === 'system' && 'text-gray-600 italic',
              line.type === 'prompt' && 'text-accent',
            )}>
              {line.text}
            </div>
          ))}
          {status === 'running' && (
            <div className="flex items-center gap-2 text-gray-500">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              <span className="text-sm">Claude is thinking...</span>
            </div>
          )}
        </div>

        {/* Input */}
        <div className="border-t border-claude-800 p-3 flex items-center gap-2">
          <Bot className="h-5 w-5 text-accent flex-shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={status === 'running' ? 'Waiting for response...' : 'Ask Claude anything...'}
            disabled={status === 'running'}
            className="flex-1 bg-transparent text-sm text-gray-200 placeholder-gray-700 focus:outline-none font-mono"
            autoFocus
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || status === 'running'}
            className="rounded-lg p-1.5 text-gray-500 hover:text-accent hover:bg-claude-800 transition-colors disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Quick tips */}
      <div className="text-[10px] text-gray-700 flex items-center gap-4 flex-shrink-0">
        <span>Enter to send</span>
        <span>·</span>
        <span>Clear to reset</span>
        <span>·</span>
        <span>Powered by <code className="text-accent">claude --print</code></span>
      </div>
    </div>
  );
}
