import { useNavigate } from 'react-router-dom';
import {
  PlayCircle, Activity, FolderOpen, Server, Clock, UserCheck, ArrowUpRight, Bot, BarChart3, TrendingUp,
} from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useDashboard } from '../hooks/useDashboard';
import { useSessions } from '../hooks/useSessions';
import { StatCard } from '../components/cards/StatCard';
import { SessionCard } from '../components/cards/SessionCard';
import { StatCardSkeleton, SessionCardSkeleton } from '../components/shared/Skeleton';
import { formatRelativeTime } from '../utils/format';
import { api } from '../api/client';
import clsx from 'clsx';

interface ChartData {
  days: { date: string; sessions: number; agents: number }[];
  projectSessions: { name: string; count: number }[];
  totalSessions: number;
  totalProjects: number;
}

// Simple inline bar chart component (no external dep)
function MiniBarChart({ data, color = 'accent', height = 120 }: { data: { label: string; value: number }[]; color?: string; height?: number }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div className="text-[9px] text-gray-600 font-mono opacity-0 group-hover:opacity-100 transition-opacity">
            {d.value}
          </div>
          <div
            className="w-full rounded-t transition-all duration-500 ease-out cursor-pointer hover:opacity-80"
            style={{
              height: `${(d.value / max) * 100}%`,
              background: `linear-gradient(to top, ${color === 'accent' ? 'rgba(168,130,255,0.6)' : 'rgba(99,102,241,0.6)'}, ${color === 'accent' ? 'rgba(168,130,255,0.3)' : 'rgba(99,102,241,0.3)'})`,
              minHeight: d.value > 0 ? 4 : 0,
            }}
          />
          <span className="text-[8px] text-gray-700 -rotate-45 origin-left whitespace-nowrap">
            {d.label.slice(5)}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();
  const { data: summary, isLoading, error } = useDashboard();
  const { data: sessions } = useSessions();
  const { data: charts } = useQuery<ChartData>({
    queryKey: ['dashboard', 'charts'],
    queryFn: () => api.get('/dashboard/charts'),
    staleTime: 60000,
  });

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
  const chartDays = charts?.days?.slice(-7) || [];
  const chartProjects = charts?.projectSessions?.slice(0, 6) || [];

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-500">
            Claude Code overview and realtime analytics
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
            <StatCard icon={Bot} label="Active Agents" value={summary.activeAgents ?? 0} onClick={() => navigate('/agents')} />
            <StatCard icon={Clock} label="Last Activity" value={summary.lastActivity ? formatRelativeTime(summary.lastActivity) : 'N/A'} />
          </>
        )}
      </div>

      {/* Charts & Quick actions */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Quick actions */}
        <div className="rounded-xl border border-claude-800 bg-claude-900 p-5">
          <h3 className="text-sm font-semibold text-gray-300">Quick Actions</h3>
          <div className="mt-4 space-y-2">
            {[
              { icon: PlayCircle, label: 'View all sessions', onClick: () => navigate('/sessions') },
              { icon: Bot, label: 'Monitor agents', onClick: () => navigate('/agents') },
              { icon: Server, label: 'Manage MCP servers', onClick: () => navigate('/mcp-servers') },
              { icon: Activity, label: 'Configure settings', onClick: () => navigate('/settings') },
              { icon: TrendingUp, label: 'View projects', onClick: () => navigate('/projects') },
            ].map((item) => (
              <button
                key={item.label}
                onClick={item.onClick}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-400 transition-colors hover:bg-claude-800 hover:text-gray-200"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
                <ArrowUpRight className="ml-auto h-3.5 w-3.5" />
              </button>
            ))}
          </div>
        </div>

        {/* Session activity chart */}
        <div className="rounded-xl border border-claude-800 bg-claude-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-300">Session Activity</h3>
            <BarChart3 className="h-4 w-4 text-gray-600" />
          </div>
          {chartDays.length > 0 ? (
            <MiniBarChart
              data={chartDays.map(d => ({ label: d.date, value: d.sessions }))}
              color="accent"
              height={100}
            />
          ) : (
            <div className="flex items-center justify-center h-24 text-xs text-gray-600">
              No session data yet
            </div>
          )}
          <p className="mt-3 text-[10px] text-gray-700 text-center">
            Sessions per day (last 7 days) · Total: {charts?.totalSessions || 0}
          </p>
        </div>

        {/* Projects distribution */}
        <div className="rounded-xl border border-claude-800 bg-claude-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-300">Top Projects</h3>
            <FolderOpen className="h-4 w-4 text-gray-600" />
          </div>
          {chartProjects.length > 0 ? (
            <div className="space-y-2">
              {chartProjects.map((p) => (
                <div key={p.name} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 flex-1 truncate" title={p.name}>
                    📁 {p.name}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-20 h-1.5 bg-claude-800 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-accent/60 to-purple-500/60"
                        style={{ width: `${Math.min((p.count / Math.max(...chartProjects.map(x => x.count), 1)) * 100, 100)}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono w-6 text-right">{p.count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-xs text-gray-600">No project data</div>
          )}
          <p className="mt-3 text-[10px] text-gray-700 text-center">
            Projects: {charts?.totalProjects || 0}
          </p>
        </div>
      </div>

      {/* Recent sessions */}
      <div className="rounded-xl border border-claude-800 bg-claude-900 p-5">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-300">Recent Sessions</h3>
          {sessions && sessions.length > 5 && (
            <button onClick={() => navigate('/sessions')} className="text-xs font-medium text-accent hover:text-accent-light">
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
  );
}
