import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Bot, Sparkles, Sun, Moon, Menu } from 'lucide-react';
import { api } from '../../api/client';
import { DashboardSummary } from '../../types/claude';
import { AskClaudeModal } from '../shared/AskClaudeModal';
import { useUIStore } from '../../store/uiStore';
import clsx from 'clsx';

export function Header() {
  const [askOpen, setAskOpen] = useState(false);
  const { theme, toggleTheme, setSidebarOpen } = useUIStore();

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
  const isLight = theme === 'light';

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
      <header className={clsx(
        'flex h-14 items-center justify-between border-b px-6 backdrop-blur-sm flex-shrink-0',
        'border-claude-800 bg-claude-900/50'
      )}>
        <div className="flex items-center gap-4">
          {/* Mobile menu button */}
          <button
            onClick={() => setSidebarOpen(true)}
            className="lg:hidden rounded-lg p-1.5 text-gray-500 hover:text-gray-300 hover:bg-claude-800 transition-colors"
            aria-label="Open sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>
          <h1 className="text-lg font-semibold text-gray-100">Claude Desk 7</h1>
        </div>

        <div className="flex items-center gap-3">
          {/* Ask Claude button */}
          <button
            onClick={() => setAskOpen(true)}
            className={clsx(
              'flex items-center gap-2 rounded-lg border px-3 py-1.5 text-xs transition-all',
              'text-gray-400 hover:text-gray-200 hover:border-accent/50',
              isLight ? 'border-claude-700 bg-white/80' : 'border-claude-700 bg-claude-800/50'
            )}
          >
            <Sparkles className="h-3.5 w-3.5 text-accent" />
            <span className="hidden sm:inline">Ask Claude</span>
            <kbd className={clsx(
              'rounded px-1.5 py-0.5 text-[10px] font-mono',
              isLight ? 'bg-claude-800/50 text-gray-500' : 'bg-claude-700 text-gray-500'
            )}>
              Ctrl+K
            </kbd>
          </button>

          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className={clsx(
              'rounded-lg p-2 transition-colors',
              'text-gray-500 hover:text-gray-300 hover:bg-claude-800'
            )}
            title={isLight ? 'Switch to dark mode' : 'Switch to light mode'}
            aria-label="Toggle theme"
          >
            {isLight ? <Moon className="h-4 w-4" /> : <Sun className="h-4 w-4" />}
          </button>

          {/* Server status */}
          <div className="flex items-center gap-2">
            <div
              className={clsx(
                'h-2 w-2 rounded-full',
                serverOk ? 'bg-green-500' : 'bg-red-500'
              )}
            />
            <span className="text-xs text-gray-500 hidden sm:inline">
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
              <span className="text-xs text-gray-500 hidden sm:inline">
                v{dashboard.claudeVersion}
              </span>
            </div>
          )}

          {dashboard && dashboard.activeSessions > 0 && (
            <span className={clsx(
              'rounded-full px-2.5 py-0.5 text-xs font-medium',
              'bg-accent/10 text-accent'
            )}>
              {dashboard.activeSessions} active
            </span>
          )}
        </div>
      </header>

      <AskClaudeModal open={askOpen} onClose={() => setAskOpen(false)} />
    </>
  );
}
