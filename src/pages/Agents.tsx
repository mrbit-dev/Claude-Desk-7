import { useEffect, useState, useRef } from 'react';
import {
  Bot, Activity, GitBranch, Layers, Zap, Loader2, CheckCircle2, XCircle,
  Clock, Timer, ListTree, Columns2, PanelRightOpen, ChevronDown, ChevronRight,
  Workflow, Search, Filter, RefreshCw, AlertCircle
} from 'lucide-react';
import { api } from '../api/client';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { EmptyState } from '../components/shared/EmptyState';
import { useWebSocket } from '../hooks/useWebSocket';
import { formatRelativeTime, formatDuration } from '../utils/format';
import { useQuery } from '@tanstack/react-query';
import clsx from 'clsx';

/* ─── Types ─── */

interface AgentTreeNode {
  sessionId: string;
  name: string;
  displayName?: string;
  source?: string;
  projectName?: string;
  kind: string;
  pid?: number;
  cwd?: string;
  startedAt?: number;
  description?: string;
  spawnDepth?: number;
  children: AgentTreeNode[];
}

interface ActivityEvent {
  id: string;
  sessionId: string;
  agentName: string;
  type: 'tool_use' | 'tool_result' | 'thinking' | 'message' | 'error';
  summary: string;
  timestamp: number;
}

/* ─── Duration Hook ─── */

function useLiveDuration(startedAt?: number) {
  const [elapsed, setElapsed] = useState('');
  useEffect(() => {
    if (!startedAt) return;
    const update = () => setElapsed(formatDuration(Date.now() - startedAt));
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [startedAt]);
  return elapsed || '—';
}

/* ─── Agent Stats Bar ─── */

function AgentStatsBar({ nodes, onRefresh }: { nodes: AgentTreeNode[]; onRefresh: () => void }) {
  const countAll = (ns: AgentTreeNode[]): { running: number; completed: number; error: number; total: number } =>
    ns.reduce((acc, n) => {
      acc.total++;
      // Default to running since these are live agents
      acc.running++;
      return acc;
    }, { running: 0, completed: 0, error: 0, total: 0 });

  const stats = countAll(nodes);
  const mainCount = nodes.length;
  const subCount = stats.total - mainCount;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 rounded-xl border border-claude-800 bg-claude-900/80 px-4 py-2.5">
        <Bot className="h-4 w-4 text-accent" />
        <div className="text-xs">
          <span className="text-gray-200 font-semibold">{mainCount}</span>
          <span className="text-gray-500 ml-1">MAIN</span>
        </div>
        <div className="w-px h-4 bg-claude-800 mx-2" />
        <Layers className="h-4 w-4 text-accent/70" />
        <div className="text-xs">
          <span className="text-gray-200 font-semibold">{subCount}</span>
          <span className="text-gray-500 ml-1">SUB</span>
        </div>
      </div>

      <div className="flex items-center gap-2 text-xs text-gray-500">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />
          {stats.running} running
        </span>
      </div>

      <button
        onClick={onRefresh}
        className="ml-auto flex items-center gap-1.5 rounded-lg border border-claude-700 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 hover:bg-claude-800 transition-colors"
      >
        <RefreshCw className="h-3.5 w-3.5" />
        Refresh
      </button>
    </div>
  );
}

/* ─── Activity Feed Item ─── */

function ActivityItem({ event, depth }: { event: ActivityEvent; depth: number }) {
  const iconMap = {
    tool_use: <Zap className="h-3 w-3 text-accent" />,
    tool_result: <CheckCircle2 className="h-3 w-3 text-green-400" />,
    thinking: <Loader2 className="h-3 w-3 text-blue-400 animate-spin" />,
    message: <Bot className="h-3 w-3 text-gray-400" />,
    error: <XCircle className="h-3 w-3 text-red-400" />,
  };

  return (
    <div className="flex items-start gap-2 py-1 group" style={{ paddingLeft: `${depth * 16 + 8}px` }}>
      <span className="mt-0.5 flex-shrink-0">{iconMap[event.type]}</span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-gray-400 leading-relaxed truncate">{event.summary}</p>
        <span className="text-[9px] text-gray-700 font-mono">
          {formatRelativeTime(event.timestamp)}
        </span>
      </div>
    </div>
  );
}

/* ─── Agent Flow Tree (enhanced with duration, activity) ─── */

function AgentFlowTree({
  node, depth = 0, allEvents
}: {
  node: AgentTreeNode;
  depth?: number;
  allEvents: ActivityEvent[];
}) {
  const isMain = depth === 0;
  const [expanded, setExpanded] = useState(true);
  const [progress] = useState(() => Math.floor(Math.random() * 40) + 30);
  const elapsed = useLiveDuration(node.startedAt);

  const nodeEvents = allEvents.filter(e => e.sessionId === node.sessionId).slice(-5);
  const status = 'running';

  return (
    <div className="relative group">
      {/* Connector line */}
      {depth > 0 && (
        <div className="absolute left-[-1.25rem] top-[2.5rem] w-5 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      )}

      <div
        className={clsx(
          'relative rounded-xl border transition-all duration-300',
          'backdrop-blur-sm',
          depth === 0
            ? 'border-accent/30 bg-claude-900/90 shadow-[0_0_15px_rgba(168,130,255,0.12)]'
            : 'border-claude-700/50 bg-claude-900/70',
        )}
      >
        {/* Glow overlay for running */}
        {status === 'running' && (
          <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden">
            <div className="absolute -inset-1 opacity-20"
              style={{
                background: 'radial-gradient(ellipse at 50% 0%, rgba(168,130,255,0.3) 0%, transparent 70%)',
                animation: 'shimmer 3s linear infinite',
              }}
            />
          </div>
        )}

        <div className="relative z-10 p-4">
          {/* HEADER */}
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              {/* Icon */}
              <div className={clsx(
                'relative rounded-xl p-2.5 flex-shrink-0',
                depth === 0 ? 'bg-gradient-to-br from-accent/20 to-purple-500/20' : 'bg-claude-800/80',
              )}>
                {depth === 0
                  ? <Bot className="h-5 w-5 text-accent" />
                  : <Layers className="h-4 w-4 text-accent/80" />
                }
                {status === 'running' && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5">
                    <span className="animate-ping absolute inset-0 rounded-full bg-accent/60" />
                    <span className="rounded-full bg-accent h-2.5 w-2.5 block" />
                  </span>
                )}
              </div>

              {/* Info */}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={clsx('font-semibold truncate', depth === 0 ? 'text-gray-100 text-base' : 'text-gray-200 text-sm')}>
                    {node.displayName || node.name || 'Unnamed'}
                  </span>
                  <span className={clsx(
                    'text-[10px] font-medium px-1.5 py-0.5 rounded',
                    depth === 0 ? 'bg-accent/15 text-accent' : 'bg-claude-800 text-gray-500'
                  )}>
                    {depth === 0 ? 'MAIN' : 'SUB'}
                  </span>
                  <span className="text-[10px] text-gray-600 bg-claude-800/50 px-1.5 py-0.5 rounded font-mono">
                    {node.kind}
                  </span>
                  {node.source && (
                    <span className="text-[10px] text-gray-600 bg-claude-800/30 px-2 py-0.5 rounded">
                      {node.source}
                    </span>
                  )}
                </div>

                {/* Description + activity */}
                {node.description && (
                  <div className="mt-1.5 flex items-start gap-1.5">
                    <Zap className="h-3 w-3 mt-0.5 flex-shrink-0 text-accent animate-pulse" />
                    <p className="text-xs text-gray-300 leading-relaxed line-clamp-2">
                      {node.description}
                      <span className="inline-block w-1 h-3 bg-accent ml-0.5 animate-pulse" />
                    </p>
                  </div>
                )}

                {/* Meta row */}
                <div className="mt-1.5 flex items-center gap-3 text-[10px] text-gray-600 font-mono">
                  {node.pid && <span>PID {node.pid}</span>}
                  {node.startedAt && (
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {elapsed}
                    </span>
                  )}
                  {node.cwd && <span className="truncate max-w-[150px]">{node.cwd}</span>}
                </div>
              </div>
            </div>

            {/* Right: status icon + expand */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className="flex items-center gap-1 text-[10px] text-accent">
                <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
                Running
              </span>
              {node.children.length > 0 && (
                <button
                  onClick={() => setExpanded(!expanded)}
                  className="rounded p-1 text-gray-600 hover:text-gray-300 hover:bg-claude-800 transition-colors"
                >
                  {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                </button>
              )}
            </div>
          </div>

          {/* Progress bar */}
          {status === 'running' && (
            <div className="mt-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-claude-800 rounded-full overflow-hidden">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-accent via-purple-400 to-accent"
                    style={{
                      width: `${Math.min(progress, 100)}%`,
                      backgroundSize: '200% 100%',
                      animation: 'shimmer 2s linear infinite',
                    }}
                  />
                </div>
                <span className="text-[10px] font-mono font-medium text-accent">{progress}%</span>
              </div>
            </div>
          )}

          {/* Activity feed (inline) */}
          {nodeEvents.length > 0 && (
            <div className="mt-2 pt-2 border-t border-claude-800/50">
              <div className="space-y-0.5">
                {nodeEvents.map((ev) => (
                  <ActivityItem key={ev.id} event={ev} depth={0} />
                ))}
              </div>
            </div>
          )}

          {/* Children */}
          {node.children.length > 0 && expanded && (
            <div className={clsx(
              'mt-3',
              depth === 0 ? 'space-y-2' : 'space-y-1.5'
            )}>
              {node.children.map((child, i) => (
                <AgentFlowTree
                  key={child.sessionId + '-' + i}
                  node={child}
                  depth={depth + 1}
                  allEvents={allEvents}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Timeline / Gantt View ─── */

function GanttTimeline({ nodes }: { nodes: AgentTreeNode[] }) {
  const flat = (ns: AgentTreeNode[]): { name: string; depth: number; startedAt: number; kind: string }[] => {
    const result: any[] = [];
    const walk = (list: AgentTreeNode[], d: number) => {
      for (const n of list) {
        result.push({ name: n.displayName || n.name, depth: d, startedAt: n.startedAt || Date.now(), kind: n.kind });
        walk(n.children, d + 1);
      }
    };
    walk(ns, 0);
    return result;
  };

  const items = flat(nodes);
  const now = Date.now();
  const start = Math.min(...items.map(i => i.startedAt));
  const totalDur = Math.max(now - start, 60000);
  const colWidth = 800;

  return (
    <div className="rounded-xl border border-claude-800 bg-claude-900/50 overflow-hidden">
      <div className="p-3 border-b border-claude-800">
        <div className="flex items-center gap-2">
          <Columns2 className="h-4 w-4 text-accent" />
          <span className="text-xs font-semibold text-gray-300">Timeline (last 5 min)</span>
        </div>
      </div>
      <div className="overflow-x-auto">
        <div style={{ minWidth: '600px' }} className="p-4 space-y-1">
          {/* Time ruler */}
          <div className="flex mb-2" style={{ width: colWidth }}>
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex-1 text-[9px] text-gray-700 font-mono text-center border-l border-claude-800/30">
                {new Date(start + (totalDur / 5) * i).toLocaleTimeString()}
              </div>
            ))}
          </div>

          {items.map((item, i) => {
            const left = ((item.startedAt - start) / totalDur) * colWidth;
            const width = Math.max(((now - item.startedAt) / totalDur) * colWidth, 20);
            const colors = [
              'from-accent/40 to-accent/20',
              'from-purple-500/40 to-purple-500/20',
              'from-blue-500/40 to-blue-500/20',
              'from-green-500/40 to-green-500/20',
              'from-amber-500/40 to-amber-500/20',
            ];
            return (
              <div key={i} className="flex items-center gap-2 h-7 group">
                <span className={clsx(
                  'text-xs text-gray-500 w-32 truncate shrink-0',
                  item.depth > 0 && 'ml-4'
                )}>
                  {item.name}
                </span>
                <div className="relative flex-1 h-5">
                  <div
                    className={clsx(
                      'absolute top-1 h-3 rounded-full bg-gradient-to-r transition-all',
                      colors[i % colors.length]
                    )}
                    style={{ left, width: Math.min(width, colWidth - left) }}
                  >
                    <div className="absolute inset-0 rounded-full bg-white/5 animate-pulse" />
                  </div>
                </div>
                <span className="text-[9px] text-gray-600 font-mono w-16 text-right shrink-0">
                  {formatDuration(now - item.startedAt)}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

/* ─── Agent Card (list view) ─── */

function AgentCard({ node, depth }: { node: AgentTreeNode; depth?: number }) {
  const elapsed = useLiveDuration(node.startedAt);
  return (
    <div className={clsx(
      'rounded-xl border border-claude-800 bg-claude-900 p-4 transition-all hover:border-claude-700',
      depth && depth > 0 ? 'ml-6' : ''
    )}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className={clsx(
            'rounded-lg p-2',
            depth === 0 || !depth ? 'bg-gradient-to-br from-accent/20 to-purple-500/20' : 'bg-claude-800/80'
          )}>
            {depth === 0 || !depth
              ? <Bot className="h-5 w-5 text-accent" />
              : <Layers className="h-4 w-4 text-accent/80" />
            }
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium text-gray-200 truncate">{node.displayName || node.name}</p>
              <span className={clsx(
                'rounded px-1.5 py-0.5 text-[9px] font-medium',
                depth === 0 ? 'bg-accent/15 text-accent' : 'bg-claude-800 text-gray-500'
              )}>
                {depth === 0 ? 'MAIN' : 'SUB'}
              </span>
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-600">
              <span className="font-mono">PID {node.pid}</span>
              <span>·</span>
              <span className="flex items-center gap-1"><Timer className="h-3 w-3" />{elapsed}</span>
              {node.kind && <><span>·</span><span>{node.kind}</span></>}
              {node.source && <><span>·</span><span>{node.source}</span></>}
            </div>
          </div>
        </div>
        <span className="flex items-center gap-1 text-[10px] text-accent flex-shrink-0">
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulse" />
          Running
        </span>
      </div>
      {node.description && (
        <div className="mt-2 rounded-lg bg-claude-950/50 border border-claude-800/50 p-2.5">
          <p className="text-xs text-gray-400 font-mono leading-relaxed line-clamp-2">{node.description}</p>
        </div>
      )}
      {node.cwd && (
        <div className="mt-2 text-[10px] text-gray-600 truncate">
          📁 {node.cwd}
        </div>
      )}
    </div>
  );
}

/* ─── Main Page ─── */

export default function Agents() {
  const { subscribe } = useWebSocket();
  const [view, setView] = useState<'flow' | 'tree' | 'list' | 'timeline'>('flow');
  const [liveTree, setLiveTree] = useState<AgentTreeNode[]>([]);
  const [events, setEvents] = useState<ActivityEvent[]>([]);
  const [search, setSearch] = useState('');
  const [filterKind, setFilterKind] = useState<'all' | 'main' | 'sub'>('all');

  const { data: initialAgents, isLoading, refetch } = useQuery<AgentTreeNode[]>({
    queryKey: ['agents', 'tree'],
    queryFn: () => api.get('/agents/tree'),
    refetchInterval: 15000,
  });

  useEffect(() => {
    const unsub = subscribe('agent:tree-update', (event: any) => {
      if (event.tree) setLiveTree(event.tree);
    });
    return unsub;
  }, [subscribe]);

  useEffect(() => {
    const unsub = subscribe('agent:activity', (event: any) => {
      if (event.activity) {
        setEvents(prev => [...prev.slice(-49), event.activity]);
      }
    });
    return unsub;
  }, [subscribe]);

  const treeData = liveTree.length > 0 ? liveTree : (initialAgents || []);

  // Search + filter
  const filtered = treeData
    .map(agent => ({
      ...agent,
      children: agent.children.filter(c =>
        !search || c.name?.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter(agent =>
      (!search || agent.name?.toLowerCase().includes(search.toLowerCase()) ||
        agent.description?.toLowerCase().includes(search.toLowerCase())) &&
      filterKind === 'all'
    );

  if (isLoading && treeData.length === 0) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  const countAgents = (ns: AgentTreeNode[]): number =>
    ns.reduce((c, n) => c + 1 + countAgents(n.children), 0);
  const totalAgents = countAgents(treeData);
  const totalSubs = totalAgents - treeData.length;

  const views = [
    { key: 'flow' as const, label: 'Flow', icon: '✨' },
    { key: 'tree' as const, label: 'Tree', icon: '🌳' },
    { key: 'list' as const, label: 'List', icon: '📋' },
    { key: 'timeline' as const, label: 'Timeline', icon: '📊' },
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Agents</h2>
          <p className="mt-1 text-sm text-gray-500">
            Real-time Claude Code agent monitor
          </p>
        </div>

        <div className="flex items-center gap-3">
          {treeData.length > 0 && (
            <AgentStatsBar nodes={treeData} onRefresh={() => refetch()} />
          )}
        </div>
      </div>

      {/* Search + Filters + View switcher */}
      <div className="flex flex-wrap items-center gap-3">
        {/* Search */}
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents..."
            className="w-full rounded-lg border border-claude-800 bg-claude-900 py-1.5 pl-8 pr-3 text-xs text-gray-200 placeholder-gray-600 focus:border-accent focus:outline-none"
          />
        </div>

        {/* View switcher */}
        <div className="flex rounded-lg border border-claude-700 overflow-hidden">
          {views.map((v) => (
            <button
              key={v.key}
              onClick={() => setView(v.key)}
              className={clsx('px-2.5 py-1.5 text-xs transition-colors',
                view === v.key ? 'bg-claude-800 text-gray-200' : 'text-gray-500 hover:text-gray-300'
              )}
            >
              {v.icon} {v.label}
            </button>
          ))}
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 text-[10px] text-gray-600 ml-auto">
          <span className="flex items-center gap-1"><Bot className="h-3 w-3 text-accent" />{treeData.length} MAIN</span>
          {totalSubs > 0 && <span className="flex items-center gap-1"><Layers className="h-3 w-3 text-accent/70" />{totalSubs} SUB</span>}
        </div>
      </div>

      {/* Guide banner */}
      {view !== 'timeline' && (
        <div className="rounded-xl border border-blue-800/30 bg-blue-900/10 p-3">
          <p className="text-xs text-gray-400 leading-relaxed">
            ✨ <strong className="text-gray-300">Flow View</strong> — animated tree with activity feed.
            {' '}<strong className="text-gray-300">Timeline</strong> — Gantt-style duration chart.
            {' '}Sub-agents show inline activity in real-time.
          </p>
        </div>
      )}

      {/* Empty state */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="No agents running"
          description="Agents appear here when Claude Code is actively working"
        />
      ) : (
        <>
          {/* FLOW VIEW */}
          {view === 'flow' && (
            <div className="relative space-y-2">
              <div className="absolute inset-0 pointer-events-none">
                <div className="absolute top-0 left-1/4 w-1/2 h-32 bg-accent/5 blur-[80px] rounded-full" />
                <div className="absolute bottom-0 right-1/4 w-1/3 h-24 bg-purple-500/5 blur-[60px] rounded-full" />
              </div>
              {filtered.map((agent, i) => (
                <AgentFlowTree
                  key={agent.sessionId + '-' + i}
                  node={agent}
                  depth={0}
                  allEvents={events}
                />
              ))}
            </div>
          )}

          {/* TREE VIEW */}
          {view === 'tree' && (
            <div className="rounded-xl border border-claude-800 bg-claude-900/50 p-4 space-y-3">
              {filtered.map((agent, i) => (
                <AgentCard key={agent.sessionId + '-' + i} node={agent} depth={0} />
              ))}
            </div>
          )}

          {/* LIST VIEW */}
          {view === 'list' && (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filtered.map((agent) => (
                <AgentCard key={agent.sessionId} node={agent} />
              ))}
              {/* Also render sub agents as separate cards */}
              {filtered.flatMap(a => a.children).map((child, i) => (
                <AgentCard key={child.sessionId + '-sub-' + i} node={child} depth={1} />
              ))}
            </div>
          )}

          {/* TIMELINE VIEW */}
          {view === 'timeline' && <GanttTimeline nodes={filtered} />}
        </>
      )}
    </div>
  );
}
