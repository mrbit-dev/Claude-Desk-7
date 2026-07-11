import { useState, useEffect, useRef } from 'react';
import { Terminal, Download } from 'lucide-react';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { EmptyState } from '../components/shared/EmptyState';
import clsx from 'clsx';

interface LogLine {
  timestamp: string;
  level: string;
  message: string;
  source?: string;
}

export default function Logs() {
  const [logs, setLogs] = useState<LogLine[]>([]);
  const [loading, setLoading] = useState(true);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const containerRef = useRef<HTMLDivElement>(null);
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    // Initial fetch
    fetch('/api/logs?lines=200')
      .then(r => r.json())
      .then((data: LogLine[]) => {
        setLogs(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    // SSE stream
    const eventSource = new EventSource('/api/logs/stream');

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        if (data.type === 'initial') {
          setLogs(data.lines);
          setConnected(true);
        } else if (data.type === 'line') {
          setLogs(prev => [...prev.slice(-1000), data.line]);
        }
      } catch { /* ignore */ }
    };

    eventSource.onopen = () => setConnected(true);
    eventSource.onerror = () => setConnected(false);

    return () => eventSource.close();
  }, []);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  // Get unique sources for filter
  const sources = ['all', ...new Set(logs.map(l => l.source || 'server'))];

  const filteredLogs = logs.filter(l => {
    if (levelFilter !== 'all' && l.level !== levelFilter) return false;
    if (sourceFilter !== 'all' && (l.source || 'server') !== sourceFilter) return false;
    return true;
  });

  const levelColor = (level: string) => {
    switch (level) {
      case 'error': return 'text-red-400';
      case 'warn': return 'text-yellow-400';
      case 'info': return 'text-blue-400';
      case 'debug': return 'text-gray-500';
      default: return 'text-gray-400';
    }
  };

  const sourceColor = (source?: string) => {
    switch (source) {
      case 'claude': return 'text-accent';
      case 'claude-launcher': return 'text-green-500';
      case 'claude-monitor': return 'text-yellow-500';
      case 'server': return 'text-gray-500';
      default: return 'text-gray-600';
    }
  };

  const sourceLabel = (source?: string) => {
    switch (source) {
      case 'claude': return 'Claude';
      case 'claude-launcher': return 'Launcher';
      case 'claude-monitor': return 'Monitor';
      case 'server': return 'Server';
      default: return source || 'Server';
    }
  };

  if (loading) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-4 h-full flex flex-col">
      <div className="flex items-center justify-between flex-shrink-0">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Logs</h2>
          <p className="mt-1 text-sm text-gray-500">
            Server logs + Claude process output — realtime
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Connection status */}
          <div className="flex items-center gap-2">
            <div className={clsx('h-2 w-2 rounded-full', connected ? 'bg-green-500' : 'bg-red-500')} />
            <span className="text-xs text-gray-500">{connected ? 'Live' : 'Offline'}</span>
          </div>

          {/* Source filter */}
          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="rounded-lg border border-claude-700 bg-claude-900 px-3 py-1.5 text-xs text-gray-400 focus:border-accent focus:outline-none"
          >
            {sources.map(s => (
              <option key={s} value={s}>{s === 'all' ? 'All sources' : sourceLabel(s)}</option>
            ))}
          </select>

          {/* Level filter */}
          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="rounded-lg border border-claude-700 bg-claude-900 px-3 py-1.5 text-xs text-gray-400 focus:border-accent focus:outline-none"
          >
            <option value="all">All levels</option>
            <option value="error">Error</option>
            <option value="warn">Warn</option>
            <option value="info">Info</option>
          </select>

          <span className="text-xs text-gray-600">{filteredLogs.length} lines</span>
        </div>
      </div>

      {/* Log viewer */}
      <div
        ref={containerRef}
        className="flex-1 overflow-y-auto rounded-xl border border-claude-800 bg-claude-950 p-4 font-mono text-xs"
      >
        {filteredLogs.length === 0 ? (
          <EmptyState
            icon={Terminal}
            title="No logs yet"
            description="Logs appear here in realtime when dashboard server runs or Claude processes are launched"
          />
        ) : (
          <div className="space-y-0.5">
            {filteredLogs.map((line, i) => (
              <div key={i} className="flex gap-2 hover:bg-claude-900/50 px-1 py-0.5 rounded">
                <span className="text-gray-700 flex-shrink-0 w-16">
                  {line.timestamp ? new Date(line.timestamp).toLocaleTimeString() : ''}
                </span>
                <span className={clsx('flex-shrink-0 w-12 uppercase', levelColor(line.level))}>
                  {line.level}
                </span>
                <span className={clsx('flex-shrink-0', sourceColor(line.source))}>
                  [{sourceLabel(line.source)}]
                </span>
                <span className="text-gray-300 break-all whitespace-pre-wrap flex-1 min-w-0">
                  {line.message}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-gray-700 flex-shrink-0">
        <span className="flex items-center gap-1"><span className="text-gray-500">[Server]</span> Dashboard server logs</span>
        <span className="flex items-center gap-1"><span className="text-accent">[Claude]</span> Claude process output</span>
        <span className="flex items-center gap-1"><span className="text-green-500">[Launcher]</span> Session launches</span>
        <span className="flex items-center gap-1"><span className="text-yellow-500">[Monitor]</span> Background monitoring</span>
      </div>
    </div>
  );
}
