import { useEffect, useRef } from 'react';
import { Terminal, XCircle } from 'lucide-react';
import clsx from 'clsx';

export interface OutputLine {
  id: string;
  text: string;
  stream: 'stdout' | 'stderr' | 'error';
  timestamp: number;
}

interface OutputConsoleProps {
  lines: OutputLine[];
  status: 'idle' | 'running' | 'done' | 'error';
  exitCode?: number | null;
  duration?: number;
}

export function OutputConsole({ lines, status, exitCode, duration }: OutputConsoleProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [lines]);

  if (status === 'idle') {
    return (
      <div className="flex flex-col items-center justify-center h-48 rounded-xl border border-claude-800 bg-claude-950 text-gray-600">
        <Terminal className="h-8 w-8 mb-2" />
        <p className="text-sm">Output will appear here after launching</p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-claude-800 bg-claude-950 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-claude-800 px-4 py-2">
        <div className="flex items-center gap-2">
          <div className={clsx(
            'h-2 w-2 rounded-full',
            status === 'running' && 'bg-green-500 animate-pulse',
            status === 'done' && 'bg-blue-500',
            status === 'error' && 'bg-red-500',
          )} />
          <span className="text-xs font-medium text-gray-500 uppercase">
            {status === 'running' ? 'Running...' : status === 'done' ? 'Completed' : 'Error'}
          </span>
        </div>
        {duration && (
          <span className="text-xs text-gray-600">{(duration / 1000).toFixed(1)}s</span>
        )}
        {exitCode !== null && exitCode !== undefined && (
          <span className={clsx(
            'text-xs font-mono',
            exitCode === 0 ? 'text-green-500' : 'text-red-400'
          )}>
            Exit code: {exitCode}
          </span>
        )}
      </div>

      {/* Output */}
      <div
        ref={containerRef}
        className="terminal-output h-64 overflow-y-auto p-4 space-y-1"
      >
        {lines.length === 0 && status === 'running' && (
          <p className="text-gray-600 italic">Waiting for output...</p>
        )}
        {lines.map((line) => (
          <div
            key={line.id}
            className={clsx(
              'text-sm whitespace-pre-wrap break-all',
              line.stream === 'stdout' && 'text-gray-300',
              line.stream === 'stderr' && 'text-yellow-400',
              line.stream === 'error' && 'text-red-400',
            )}
          >
            {line.text}
          </div>
        ))}
        {status === 'running' && (
          <span className="inline-block w-2 h-4 bg-gray-500 animate-pulse" />
        )}
      </div>
    </div>
  );
}
