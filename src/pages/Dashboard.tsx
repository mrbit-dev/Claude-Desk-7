import { useNavigate } from 'react-router-dom';
import {
  PlayCircle,
  Activity,
  FolderOpen,
  Server,
  Clock,
  UserCheck,
  ArrowUpRight,
  Bot,
} from 'lucide-react';
import { useDashboard } from '../hooks/useDashboard';
import { useSessions } from '../hooks/useSessions';
import { StatCard } from '../components/cards/StatCard';
import { SessionCard } from '../components/cards/SessionCard';
import { StatCardSkeleton, SessionCardSkeleton } from '../components/shared/Skeleton';
import { formatRelativeTime } from '../utils/format';

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: summary, isLoading, error } = useDashboard();
  const { data: sessions } = useSessions();

  if (error && !summary) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="rounded-xl border border-red-800 bg-red-900/20 p-6 text-center">
          <p className="text-red-400">Failed to connect to server</p>
          <p className="mt-1 text-sm text-gray-500">Make sure the backend is running on port 3712</p>
        </div>
      </div>
    );
  }

  const recentSessions = sessions?.slice(0, 5) || [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-500">
            Claude Code overview and quick actions
          </p>
        </div>
        {summary?.claudeVersion && (
          <div className="flex items-center gap-2 rounded-lg border border-claude-800 bg-claude-900 px-3 py-2">
            <Bot className="h-4 w-4 text-accent" />
            <span className="text-sm text-gray-400">v{summary.claudeVersion}</span>
          </div>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {!summary ? (
          <>
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
            <StatCardSkeleton />
          </>
        ) : (
          <>
            <StatCard icon={PlayCircle} label="Active Sessions" value={summary.activeSessions} onClick={() => navigate('/sessions')} />
            <StatCard icon={Activity} label="Total Sessions" value={summary.totalSessions} onClick={() => navigate('/sessions')} />
            <StatCard icon={FolderOpen} label="Projects" value={summary.projectsCount} onClick={() => navigate('/projects')} />
            <StatCard icon={Server} label="MCP Servers" value={`${summary.mcpsHealthy}/${summary.mcpsTotal}`} subtext="configured" onClick={() => navigate('/mcp-servers')} />
            <StatCard icon={Clock} label="Last Activity" value={summary.lastActivity ? formatRelativeTime(summary.lastActivity) : 'N/A'} />
            <StatCard icon={UserCheck} label="Auth Status" value={summary.authStatus === 'logged_in' ? 'Logged In' : 'Logged Out'} trend={summary.authStatus === 'logged_in' ? 'up' : 'neutral'} onClick={() => navigate('/auth')} />
          </>
        )}
      </div>

      {/* Quick actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="rounded-xl border border-claude-800 bg-claude-900 p-5">
          <h3 className="text-sm font-semibold text-gray-300">Quick Actions</h3>
          <div className="mt-4 space-y-2">
            <button
              onClick={() => navigate('/sessions')}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-400 transition-colors hover:bg-claude-800 hover:text-gray-200"
            >
              <PlayCircle className="h-4 w-4" />
              <span>View all sessions</span>
              <ArrowUpRight className="ml-auto h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-400 transition-colors hover:bg-claude-800 hover:text-gray-200"
            >
              <Server className="h-4 w-4" />
              <span>Manage MCP servers</span>
              <ArrowUpRight className="ml-auto h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => navigate('/settings')}
              className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-400 transition-colors hover:bg-claude-800 hover:text-gray-200"
            >
              <Activity className="h-4 w-4" />
              <span>Configure settings</span>
              <ArrowUpRight className="ml-auto h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {/* Recent sessions */}
        <div className="col-span-2 rounded-xl border border-claude-800 bg-claude-900 p-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-gray-300">Recent Sessions</h3>
            {sessions && sessions.length > 5 && (
              <button
                onClick={() => navigate('/sessions')}
                className="text-xs font-medium text-accent hover:text-accent-light"
              >
                View all
              </button>
            )}
          </div>
          <div className="mt-4 space-y-2">
            {!sessions ? (
              <>
                <SessionCardSkeleton />
                <SessionCardSkeleton />
                <SessionCardSkeleton />
              </>
            ) : recentSessions.length === 0 ? (
              <p className="py-8 text-center text-sm text-gray-600">No sessions yet</p>
            ) : (
              recentSessions.map((s) => (
                <SessionCard
                  key={s.sessionId}
                  session={s}
                  onClick={() => navigate(`/sessions/${s.sessionId}`)}
                />
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
