import { useNavigate } from 'react-router-dom';
import { PlayCircle, Activity, FolderOpen, Server, Clock, UserCheck, ArrowUpRight, Bot, BarChart3, TrendingUp, Search, DollarSign, Layers } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { useDashboard } from '../hooks/useDashboard';
import { useSessions } from '../hooks/useSessions';
import { StatCard } from '../components/cards/StatCard';
import { SessionCard } from '../components/cards/SessionCard';
import { StatCardSkeleton, SessionCardSkeleton } from '../components/shared/Skeleton';
import { formatRelativeTime } from '../utils/format';
import { api } from '../api/client';
import { useState } from 'react';
import clsx from 'clsx';
import { TokenUsageChart, TokenUsageData } from '../components/dashboard/TokenUsageChart';

interface ChartData {
  days: { date: string; sessions: number; agents: number }[];
  projectSessions: { name: string; count: number }[];
  totalSessions: number;
  totalProjects: number;
}

// Mini bar chart
function MiniBarChart({ data, color = 'accent', height = 100 }: { data: { label: string; value: number }[]; color?: string; height?: number }) {
  const max = Math.max(...data.map(d => d.value), 1);
  return (
    <div className="flex items-end gap-1" style={{ height }}>
      {data.map((d, i) => (
        <div key={i} className="flex-1 flex flex-col items-center gap-1 group relative">
          <div className="text-[9px] text-gray-600 font-mono opacity-0 group-hover:opacity-100">{d.value}</div>
          <div
            className="w-full rounded-t transition-all duration-500 ease-out cursor-pointer hover:opacity-80"
            style={{
              height: `${(d.value / max) * 100}%`,
              background: `linear-gradient(to top, ${color === 'accent' ? 'rgba(168,130,255,0.7)' : 'rgba(99,102,241,0.7)'}, ${color === 'accent' ? 'rgba(168,130,255,0.2)' : 'rgba(99,102,241,0.2)'})`,
              minHeight: d.value > 0 ? 4 : 0,
            }}
          />
          <span className="text-[7px] text-gray-700 -rotate-45 origin-left whitespace-nowrap">{d.label.slice(5)}</span>
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
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const { data: tokenData, isPending: tokenPending } = useQuery<TokenUsageData>({
    queryKey: ['dashboard', 'token-usage'],
    queryFn: () => api.get('/dashboard/token-usage?range=all'),
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
  const totalCost = charts?.totalSessions ? (charts.totalSessions * 0.003).toFixed(3) : '0';

  // Search handler
  const handleSearch = async () => {
    if (!searchQuery.trim()) return;
    setSearching(true);
    try {
      const res = await fetch(`/api/sessions/search?q=${encodeURIComponent(searchQuery)}`);
      const data = await res.json();
      setSearchResults(data.results || []);
    } catch { setSearchResults([]); }
    setSearching(false);
  };

  return (
    <div className="space-y-6">
      {/* Page header with search */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Dashboard</h2>
          <p className="mt-1 text-sm text-gray-500">Claude Code overview & analytics</p>
        </div>
        <div className="flex items-center gap-3">
          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search sessions..."
              className="w-56 rounded-lg border border-claude-800 bg-claude-900 py-2 pl-10 pr-3 text-sm text-gray-200 placeholder-gray-600 focus:border-accent focus:outline-none"
            />
            {searchResults.length > 0 && (
              <div className="absolute top-full mt-1 right-0 w-96 max-h-64 overflow-y-auto rounded-xl border border-claude-700 bg-claude-900 shadow-2xl z-50 p-2 space-y-1">
                <div className="flex items-center justify-between px-2 py-1 border-b border-claude-800 mb-1">
                  <span className="text-xs text-gray-500">{searchResults.length} results</span>
                  <button onClick={() => { setSearchResults([]); setSearchQuery(''); }} className="text-[10px] text-gray-600 hover:text-gray-400">Clear</button>
                </div>
                {searchResults.map((r, i) => (
                  <button
                    key={i}
                    onClick={() => { navigate(`/sessions/${r.sessionId}`); setSearchResults([]); }}
                    className="w-full text-left rounded-lg px-3 py-2 hover:bg-claude-800 transition-colors"
                  >
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-gray-500">{r.role}</span>
                      <span className="text-gray-700 font-mono">{r.sessionId.slice(0, 8)}...</span>
                    </div>
                    <p className="text-xs text-gray-400 mt-0.5 line-clamp-2">{r.snippet}</p>
                  </button>
                ))}
              </div>
            )}
          </div>
          {summary?.claudeVersion && (
            <div className="flex items-center gap-2 rounded-lg border border-claude-800 bg-claude-900 px-3 py-2">
              <Bot className="h-4 w-4 text-accent" />
              <span className="text-sm text-gray-400">v{summary.claudeVersion}</span>
            </div>
          )}
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        {!summary ? (
          Array(6).fill(0).map((_, i) => <StatCardSkeleton key={i} />)
        ) : (
          <>
            <StatCard icon={PlayCircle} label="Active Sessions" value={summary.activeSessions} onClick={() => navigate('/sessions')} />
            <StatCard icon={Activity} label="Total Sessions" value={summary.totalSessions} onClick={() => navigate('/sessions')} />
            <StatCard icon={FolderOpen} label="Projects" value={summary.projectsCount} onClick={() => navigate('/projects')} />
            <StatCard icon={Server} label="MCP Servers" value={`${summary.mcpsHealthy}/${summary.mcpsTotal}`} subtext="configured" onClick={() => navigate('/mcp-servers')} />
            <StatCard icon={Bot} label="Active Agents" value={summary.activeAgents ?? 0} onClick={() => navigate('/agents')} />
            <StatCard icon={DollarSign} label="Est. Cost" value={`$${totalCost}`} subtext={`${charts?.totalSessions || 0} sessions`} />
          </>
        )}
      </div>

      {/* Charts row */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* Session activity */}
        <div className="rounded-xl border border-claude-800 bg-claude-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-300">Session Activity</h3>
            <BarChart3 className="h-4 w-4 text-gray-600" />
          </div>
          {chartDays.length > 0 ? (
            <MiniBarChart data={chartDays.map(d => ({ label: d.date, value: d.sessions }))} height={100} />
          ) : (
            <div className="flex items-center justify-center h-24 text-xs text-gray-600">No data yet</div>
          )}
          <p className="mt-3 text-[10px] text-gray-700 text-center">Sessions/day · Total: {charts?.totalSessions || 0}</p>
        </div>

        {/* Top Projects */}
        <div className="rounded-xl border border-claude-800 bg-claude-900 p-5">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-gray-300">Top Projects</h3>
            <FolderOpen className="h-4 w-4 text-gray-600" />
          </div>
          {chartProjects.length > 0 ? (
            <div className="space-y-2">
              {chartProjects.map((p) => (
                <div key={p.name} className="flex items-center gap-2">
                  <span className="text-xs text-gray-400 flex-1 truncate">📁 {p.name}</span>
                  <div className="flex items-center gap-1.5">
                    <div className="w-20 h-1.5 bg-claude-800 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-gradient-to-r from-accent/60 to-purple-500/60" style={{ width: `${Math.min((p.count / Math.max(...chartProjects.map(x => x.count), 1)) * 100, 100)}%` }} />
                    </div>
                    <span className="text-[10px] text-gray-500 font-mono w-6 text-right">{p.count}</span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="flex items-center justify-center h-24 text-xs text-gray-600">No data</div>
          )}
          <p className="mt-3 text-[10px] text-gray-700 text-center">Projects: {charts?.totalProjects || 0}</p>
        </div>

        {/* Quick Actions */}
        <div className="rounded-xl border border-claude-800 bg-claude-900 p-5">
          <h3 className="text-sm font-semibold text-gray-300 mb-4">Quick Actions</h3>
          <div className="space-y-1.5">
            {[
              { icon: PlayCircle, label: 'All Sessions', color: 'text-accent', to: '/sessions' },
              { icon: Bot, label: 'Agent Monitor', color: 'text-green-400', to: '/agents' },
              { icon: Server, label: 'MCP Servers', color: 'text-blue-400', to: '/mcp-servers' },
              { icon: TrendingUp, label: 'Projects', color: 'text-yellow-400', to: '/projects' },
              { icon: Search, label: 'Smart Search', color: 'text-purple-400', to: '/sessions' },
            ].map((item) => (
              <button
                key={item.label}
                onClick={() => navigate(item.to)}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-400 hover:bg-claude-800 hover:text-gray-200 transition-colors"
              >
                <item.icon className={clsx('h-4 w-4', item.color)} />
                <span>{item.label}</span>
                <ArrowUpRight className="ml-auto h-3.5 w-3.5 text-gray-700" />
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Token Usage */}
      <TokenUsageChart
        data={tokenData?.daily || []}
        totals={tokenData?.totals || { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, sessions: 0 }}
        byModel={tokenData?.byModel || []}
        estimatedCost={tokenData?.estimatedCost || 0}
        isPending={tokenPending}
      />

      {/* Recent Sessions */}
      <div className="rounded-xl border border-claude-800 bg-claude-900 p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-gray-300">Recent Sessions</h3>
          {sessions && sessions.length > 5 && (
            <button onClick={() => navigate('/sessions')} className="text-xs font-medium text-accent hover:text-accent-light">View all</button>
          )}
        </div>
        <div className="space-y-2">
          {!sessions ? (
            Array(3).fill(0).map((_, i) => <SessionCardSkeleton key={i} />)
          ) : recentSessions.length === 0 ? (
            <p className="py-8 text-center text-sm text-gray-600">No sessions yet</p>
          ) : (
            recentSessions.map((s) => (
              <SessionCard key={s.sessionId} session={s} onClick={() => navigate(`/sessions/${s.sessionId}`)} />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
