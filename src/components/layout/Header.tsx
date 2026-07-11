import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, Sparkles } from 'lucide-react';
import { api } from '../../api/client';
import { DashboardSummary } from '../../types/claude';
import { AskClaudeModal } from '../shared/AskClaudeModal';
import clsx from 'clsx';

export function Header() {
  const [askOpen, setAskOpen] = useState(false);

  const { data: health } = useQuery({
    queryKey: ['health'],
    queryFn: () => api.get<{ status: string }>('/health'),
    refetchInterval: 30000,
  });

  const { data: dashboard } = useQuery<DashboardSummary>({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/dashboard/summary'),
    staleTime: 30000,
  });

  const serverOk = health?.status === 'ok';

  // Add global keyboard shortcut
  useState(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setAskOpen(true);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  });

  return (
    <>
      <header className="flex h-14 items-center justify-between border-b border-claude-800 bg-claude-900/50 px-6 backdrop-blur-sm flex-shrink-0">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-100">Claude Desk 7</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Ask Claude button */}
          <button
            onClick={() => setAskOpen(true)}
            className="flex items-center gap-2 rounded-lg border border-claude-700 bg-claude-800/50 px-3 py-1.5 text-xs text-gray-400 hover:text-gray-200 hover:border-accent/50 transition-all"
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span>Ask Claude</span>
            <kbd className="rounded bg-claude-700 px-1.5 py-0.5 text-[10px] text-gray-500 font-mono">
              Ctrl+K
            </kbd>
          </button>

          {/* Server status */}
          <div className="flex items-center gap-2">
            <div
              className={clsx(
                'h-2 w-2 rounded-full',
                serverOk ? 'bg-green-500' : 'bg-red-500'
              )}
            />
            <span className="text-xs text-gray-500">
              {serverOk ? 'OK' : 'Offline'}
            </span>
          </div>

          {/* Claude status */}
          {dashboard && (
            <div className="flex items-center gap-2">
              <div
                className={clsx(
                  'h-2 w-2 rounded-full',
                  dashboard.authStatus === 'logged_in' ? 'bg-green-500' : 'bg-yellow-500'
                )}
              />
              <span className="text-xs text-gray-500">
                v{dashboard.claudeVersion}
              </span>
            </div>
          )}

          {dashboard && dashboard.activeSessions > 0 && (
            <span className="rounded-full bg-accent/10 px-2.5 py-0.5 text-xs font-medium text-accent">
              {dashboard.activeSessions} active
            </span>
          )}
        </div>
      </header>

      <AskClaudeModal open={askOpen} onClose={() => setAskOpen(false)} />
    </>
  );
}
