import { useEffect, useState, useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Bot, Layers, Zap, Loader2, CheckCircle2, XCircle, AlertCircle,
  Clock, Timer, ChevronDown, ChevronRight, Search, RefreshCw,
  PanelRightOpen, MessageSquare, FileText, X, List, Wrench, Brain,
} from 'lucide-react';
import { api } from '../api/client';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { EmptyState } from '../components/shared/EmptyState';
import { useWebSocket } from '../hooks/useWebSocket';
import { formatRelativeTime, formatDuration } from '../utils/format';
import clsx from 'clsx';

/* ─── Types ─── */

interface AgentActivity {
  type: 'tool_use' | 'tool_result' | 'thinking' | 'message' | 'error' | 'file_write';
  toolName?: string;
  toolInput?: unknown;
  thinking?: string;
  summary?: string;
  timestamp: string;
}

interface AgentUnifiedNode {
  id: string;
  name: string;
  description: string;
  kind: string;
  status: 'running' | 'completed' | 'error' | 'pending';
  source: string;
  sessionId: string;
  pid?: number;
  cwd?: string;
  startedAt?: number;
  progress: number;
  activity: AgentActivity[];
  children: AgentUnifiedNode[];
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

/* ─── Activity Icon ─── */

function ActivityIcon({ type, size = 'sm' }: { type: string; size?: 'sm' | 'xs' }) {
  const cls = size === 'xs' ? 'h-2.5 w-2.5' : 'h-3 w-3';
  switch (type) {
    case 'tool_use': return <Wrench className={`${cls} text-accent`} />;
    case 'tool_result': return <CheckCircle2 className={`${cls} text-green-400`} />;
    case 'thinking': return <Brain className={`${cls} text-blue-400`} />;
    case 'message': return <MessageSquare className={`${cls} text-gray-400`} />;
    case 'error': return <XCircle className={`${cls} text-red-400`} />;
    case 'file_write': return <FileText className={`${cls} text-amber-400`} />;
    default: return <Zap className={`${cls} text-accent`} />;
  }
}

/* ─── Mini Transcript Viewer (slide-over) ─── */

function MiniTranscriptViewer({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [lines, setLines] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    api.get(`/agents/transcript/${sessionId}?limit=30`)
      .then((data: any) => setLines(data.lines || []))
      .catch(() => setLines([]))
      .finally(() => setLoading(false));
  }, [sessionId]);

  useEffect(() => {
    if (!sessionId) return;
    const id = setInterval(() => {
      api.get(`/agents/transcript/${sessionId}?limit=30`)
        .then((data: any) => setLines(data.lines || []))
        .catch(() => {});
    }, 3000);
    return () => clearInterval(id);
  }, [sessionId]);

  return (
    <div className="fixed right-0 top-0 h-full w-96 border-l border-claude-800 bg-claude-900 z-50 shadow-2xl flex flex-col">
      <div className="flex items-center justify-between border-b border-claude-800 px-4 py-3">
        <h3 className="text-xs font-semibold text-gray-300 flex items-center gap-2">
          <MessageSquare className="h-3.5 w-3.5 text-accent" />
          Agent Transcript
          <span className="text-[10px] text-gray-600 font-mono">{sessionId.slice(0, 8)}</span>
        </h3>
        <button onClick={onClose} className="rounded p-1 text-gray-500 hover:text-gray-300 hover:bg-claude-800 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 text-gray-500 animate-spin" /></div>
        ) : lines.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-8">No transcript data available</p>
        ) : (
          lines.slice().reverse().map((line, i) => (
            <div key={i} className="rounded-lg border border-claude-800 bg-claude-950/50 p-2.5">
              <div className="flex items-center gap-1.5 mb-1">
                <span className={clsx(
                  'text-[10px] font-medium px-1 py-0.5 rounded',
                  line.type === 'user' ? 'bg-accent/15 text-accent' : 'bg-blue-900/20 text-blue-400'
                )}>
                  {line.type === 'user' ? 'USER' : 'CLAUDE'}
                </span>
                {line.message?.model && (
                  <span className="text-[9px] text-gray-600 font-mono">{line.message.model}</span>
                )}
                <span className="text-[9px] text-gray-700 ml-auto font-mono">
                  {line.timestamp ? new Date(line.timestamp).toLocaleTimeString() : ''}
                </span>
              </div>
              {line.message?.content?.map((block: any, j: number) => (
                <div key={j}>
                  {block.type === 'text' && (
                    <p className="text-[11px] text-gray-400 leading-relaxed line-clamp-3 whitespace-pre-wrap">{block.text}</p>
                  )}
                  {block.type === 'tool_use' && (
                    <div className="flex items-center gap-1 text-[10px] text-accent">
                      <Wrench className="h-3 w-3" /> {block.name}
                    </div>
                  )}
                  {block.type === 'thinking' && (
                    <div className="flex items-center gap-1 text-[10px] text-blue-400/70 italic">
                      <Brain className="h-3 w-3" /> Thinking...
                    </div>
                  )}
                  {block.type === 'tool_result' && (
                    <div className="text-[10px] text-green-400/70">✓ Tool result</div>
                  )}
                </div>
              ))}
            </div>
          ))
        )}
      </div>
      <div className="border-t border-claude-800 px-4 py-2 text-[10px] text-gray-700 text-center">
        Auto-updates every 3s
      </div>
    </div>
  );
}

/* ─── Agent Log Viewer ─── */

function AgentLogViewer({ sessionId, onClose }: { sessionId: string; onClose: () => void }) {
  const [logs, setLogs] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get(`/agents/logs/${sessionId}`)
      .then((data: any) => setLogs(data.logs || []))
      .catch(() => setLogs(['Failed to load logs']))
      .finally(() => setLoading(false));
  }, [sessionId]);

  return (
    <div className="fixed right-0 top-0 h-full w-96 border-l border-claude-800 bg-claude-900 z-50 shadow-2xl flex flex-col">
      <div className="flex items-center justify-between border-b border-claude-800 px-4 py-3">
        <h3 className="text-xs font-semibold text-gray-300 flex items-center gap-2">
          <List className="h-3.5 w-3.5 text-accent" />
          Agent Details
          <span className="text-[10px] text-gray-600 font-mono">{sessionId.slice(0, 8)}</span>
        </h3>
        <button onClick={onClose} className="rounded p-1 text-gray-500 hover:text-gray-300 hover:bg-claude-800 transition-colors">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {loading ? (
          <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 text-gray-500 animate-spin" /></div>
        ) : logs.length === 0 ? (
          <p className="text-xs text-gray-600 text-center py-8">No details available</p>
        ) : (
          <div className="space-y-1 font-mono">
            {logs.map((log, i) => (
              <p key={i} className="text-[11px] text-gray-500 leading-relaxed whitespace-pre-wrap">{log}</p>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Agent Flow Tree (enhanced) ─── */

function AgentFlowTree({
  node, depth = 0, onViewTranscript, onViewLogs
}: {
  node: AgentUnifiedNode;
  depth?: number;
  onViewTranscript: (sessionId: string) => void;
  onViewLogs: (sessionId: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const elapsed = useLiveDuration(node.startedAt);
  const isMain = depth === 0;
  const isRunning = node.status === 'running';
  const isError = node.status === 'error';

  const recentActivity = node.activity.slice(-3);

  return (
    <div className="relative">
      {depth > 0 && (
        <div className="absolute left-[-1.25rem] top-[2.5rem] w-5 h-px bg-gradient-to-r from-transparent via-accent/30 to-transparent" />
      )}

      <div className={clsx(
        'relative rounded-xl border transition-all duration-300 backdrop-blur-sm',
        isMain ? 'border-accent/30 bg-claude-900/90 shadow-[0_0_15px_rgba(168,130,255,0.12)]' : 'border-claude-700/50 bg-claude-900/70',
        isError && 'border-red-800/50 shadow-[0_0_10px_rgba(248,113,113,0.1)]',
        !isRunning && !isError && 'border-claude-800/80',
      )}>
        {isRunning && (
          <div className="absolute inset-0 rounded-xl pointer-events-none overflow-hidden">
            <div className="absolute -inset-1 opacity-20"
              style={{
                background: 'radial-gradient(ellipse at 50% 0%, rgba(168,130,255,0.3) 0%, transparent 70%)',
              }}
            />
          </div>
        )}

        <div className="relative z-10 p-4">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-3 min-w-0 flex-1">
              <div className={clsx(
                'relative rounded-xl p-2.5 flex-shrink-0',
                isMain ? 'bg-gradient-to-br from-accent/20 to-purple-500/20' : 'bg-claude-800/80',
              )}>
                {isMain ? <Bot className="h-5 w-5 text-accent" /> : <Layers className="h-4 w-4 text-accent/80" />}
                {isRunning && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5">
                    <span className="animate-ping absolute inset-0 rounded-full bg-accent/60" />
                    <span className="rounded-full bg-accent h-2.5 w-2.5 block" />
                  </span>
                )}
                {isError && (
                  <span className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5">
                    <span className="rounded-full bg-red-500 h-2.5 w-2.5 block" />
                  </span>
                )}
              </div>

              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={clsx('font-semibold truncate', isMain ? 'text-gray-100 text-base' : 'text-gray-200 text-sm')}>
                    {node.name}
                  </span>
                  <span className={clsx(
                    'text-[10px] font-medium px-1.5 py-0.5 rounded',
                    isMain ? 'bg-accent/15 text-accent' : 'bg-claude-800 text-gray-500'
                  )}>{isMain ? 'MAIN' : 'SUB'}</span>
                  <span className="text-[10px] text-gray-600 bg-claude-800/50 px-1.5 py-0.5 rounded font-mono">{node.kind}</span>
                  <span className={clsx(
                    'text-[10px] px-1.5 py-0.5 rounded',
                    node.source === 'dashboard' ? 'bg-blue-900/20 text-blue-400' : 'bg-claude-800/50 text-gray-500'
                  )}>{node.source}</span>
                </div>

                {node.description && (
                  <div className="mt-1.5 flex items-start gap-1.5">
                    <ActivityIcon type={recentActivity[0]?.type || 'message'} />
                    <p className={clsx('text-xs leading-relaxed line-clamp-2', isRunning ? 'text-gray-300' : 'text-gray-500')}>
                      {node.description}
                      {isRunning && <span className="inline-block w-1 h-3 bg-accent ml-0.5 animate-pulse" />}
                    </p>
                  </div>
                )}

                <div className="mt-1.5 flex items-center gap-3 text-[10px] text-gray-600 font-mono flex-wrap">
                  {node.pid && <span>PID {node.pid}</span>}
                  {node.startedAt && (
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{elapsed}</span>
                  )}
                  <span className={clsx('flex items-center gap-1', isRunning && 'text-accent', isError && 'text-red-400')}>
                    <span className={clsx('h-1.5 w-1.5 rounded-full', isRunning ? 'bg-accent animate-pulse' : isError ? 'bg-red-500' : 'bg-gray-500')} />
                    {node.status}
                  </span>
                  <span className="text-gray-700">{node.progress}%</span>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-1 flex-shrink-0">
              <button onClick={() => onViewTranscript(node.sessionId)}
                className="rounded-lg border border-claude-700 p-1.5 text-gray-500 hover:text-accent hover:border-accent/40 transition-colors" title="View transcript">
                <MessageSquare className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => onViewLogs(node.sessionId)}
                className="rounded-lg border border-claude-700 p-1.5 text-gray-500 hover:text-accent hover:border-accent/40 transition-colors" title="View details">
                <List className="h-3.5 w-3.5" />
              </button>
              {node.children.length > 0 && (
                <button onClick={() => setExpanded(!expanded)}
                  className="rounded-lg border border-claude-700 p-1.5 text-gray-500 hover:text-gray-300 hover:bg-claude-800 transition-colors">
                  {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                </button>
              )}
            </div>
          </div>

          {isRunning && (
            <div className="mt-3">
              <div className="flex items-center gap-3">
                <div className="flex-1 h-1.5 bg-claude-800 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-accent via-purple-400 to-accent transition-all duration-1000 ease-out"
                    style={{ width: `${Math.min(node.progress, 100)}%`, backgroundSize: '200% 100%', animation: 'shimmer 2s linear infinite' }} />
                </div>
                <span className="text-[10px] font-mono font-medium text-accent">{node.progress}%</span>
              </div>
            </div>
          )}

          {node.activity.length > 0 && (
            <div className="mt-2 pt-2 border-t border-claude-800/50 space-y-0.5">
              {node.activity.slice(-5).reverse().map((act, i) => (
                <div key={i} className="flex items-start gap-1.5 py-0.5 group">
                  <ActivityIcon type={act.type} size="xs" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-gray-500 leading-relaxed truncate">
                      {act.type === 'tool_use' && <>🔧 <span className="text-accent">{act.toolName}</span></>}
                      {act.type === 'tool_result' && <>✅ Tool result</>}
                      {act.type === 'thinking' && <>🧠 <span className="text-blue-400/70">Thinking...</span></>}
                      {act.type === 'message' && <>{act.summary?.slice(0, 120)}</>}
                      {act.type === 'error' && <span className="text-red-400">{act.summary}</span>}
                      {act.type === 'file_write' && <>📄 {act.summary}</>}
                    </p>
                    <span className="text-[8px] text-gray-700 font-mono">
                      {act.timestamp ? formatRelativeTime(new Date(act.timestamp).getTime()) : ''}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}

          {node.children.length > 0 && expanded && (
            <div className={clsx('mt-3 space-y-2')}>
              {node.children.map((child, i) => (
                <AgentFlowTree key={child.id || i} node={child} depth={depth + 1}
                  onViewTranscript={onViewTranscript} onViewLogs={onViewLogs} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Stats Bar ─── */

function AgentStatsBar({ roots, onRefresh }: { roots: AgentUnifiedNode[]; onRefresh: () => void }) {
  const countAll = (nodes: AgentUnifiedNode[]): { running: number; completed: number; error: number; total: number } => {
    let running = 0, completed = 0, error = 0;
    const walk = (list: AgentUnifiedNode[]) => {
      for (const n of list) {
        if (n.status === 'running') running++;
        if (n.status === 'completed') completed++;
        if (n.status === 'error') error++;
        walk(n.children);
      }
    };
    walk(nodes);
    return { running, completed, error, total: running + completed + error };
  };

  const stats = countAll(roots);
  const mainCount = roots.length;
  const subCount = stats.total - mainCount;

  return (
    <div className="flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2 rounded-xl border border-claude-800 bg-claude-900/80 px-4 py-2.5">
        <Bot className="h-4 w-4 text-accent" />
        <div className="text-xs"><span className="text-gray-200 font-semibold">{mainCount}</span><span className="text-gray-500 ml-1">MAIN</span></div>
        <div className="w-px h-4 bg-claude-800 mx-2" />
        <Layers className="h-4 w-4 text-accent/70" />
        <div className="text-xs"><span className="text-gray-200 font-semibold">{subCount}</span><span className="text-gray-500 ml-1">SUB</span></div>
      </div>
      <div className="flex items-center gap-2 text-xs text-gray-500">
        {stats.running > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-green-400 animate-pulse" />{stats.running} running</span>}
        {stats.completed > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-gray-500" />{stats.completed} done</span>}
        {stats.error > 0 && <span className="flex items-center gap-1"><span className="h-2 w-2 rounded-full bg-red-500" />{stats.error} errors</span>}
      </div>
      <button onClick={onRefresh} className="ml-auto flex items-center gap-1.5 rounded-lg border border-claude-700 px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300 hover:bg-claude-800 transition-colors">
        <RefreshCw className="h-3.5 w-3.5" /> Refresh
      </button>
    </div>
  );
}

/* ─── Main Page ─── */

export default function Agents() {
  const { subscribe } = useWebSocket();
  const [liveRoots, setLiveRoots] = useState<AgentUnifiedNode[]>([]);
  const [search, setSearch] = useState('');
  const [transcriptSessionId, setTranscriptSessionId] = useState<string | null>(null);
  const [logSessionId, setLogSessionId] = useState<string | null>(null);

  const { data: initialRoots, isLoading, refetch } = useQuery({
    queryKey: ['agents', 'unified'],
    queryFn: () => api.get('/agents/unified'),
    refetchInterval: 5000,
  });

  useEffect(() => {
    const unsub = subscribe('agents:sync', (event: any) => {
      if (event.roots) setLiveRoots(event.roots);
    });
    return unsub;
  }, [subscribe]);

  const roots = liveRoots.length > 0 ? liveRoots : (initialRoots || []);

  const filtered = roots
    .map(agent => ({
      ...agent,
      children: agent.children.filter(c =>
        !search || c.name?.toLowerCase().includes(search.toLowerCase()) ||
        c.description?.toLowerCase().includes(search.toLowerCase())
      ),
    }))
    .filter(agent =>
      !search || agent.name?.toLowerCase().includes(search.toLowerCase()) ||
      agent.description?.toLowerCase().includes(search.toLowerCase())
    );

  const countAll = (nodes: AgentUnifiedNode[]): number =>
    nodes.reduce((c, n) => c + 1 + countAll(n.children), 0);
  const totalAgents = countAll(roots);
  const totalSubs = totalAgents - roots.length;

  const onViewTranscript = useCallback((sid: string) => setTranscriptSessionId(sid), []);
  const onViewLogs = useCallback((sid: string) => setLogSessionId(sid), []);

  if (isLoading && roots.length === 0) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Agents</h2>
          <p className="mt-1 text-sm text-gray-500">Unified agent monitor — Claude + Dashboard + Sub-agents in real-time</p>
        </div>
        <div className="flex items-center gap-3">
          {roots.length > 0 && <AgentStatsBar roots={roots} onRefresh={() => refetch()} />}
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[160px] max-w-xs">
          <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-600" />
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents..."
            className="w-full rounded-lg border border-claude-800 bg-claude-900 py-1.5 pl-8 pr-3 text-xs text-gray-200 placeholder-gray-600 focus:border-accent focus:outline-none" />
        </div>
        <div className="flex items-center gap-3 text-[10px] text-gray-600 ml-auto">
          <span className="flex items-center gap-1"><Bot className="h-3 w-3 text-accent" />{roots.length} MAIN</span>
          {totalSubs > 0 && <span className="flex items-center gap-1"><Layers className="h-3 w-3 text-accent/70" />{totalSubs} SUB</span>}
          <span className="text-gray-700">|</span>
          <span className="text-[10px] text-gray-700">Click <MessageSquare className="h-3 w-3 inline" /> for transcript</span>
        </div>
      </div>

      {roots.length > 0 && (
        <div className="rounded-xl border border-blue-800/30 bg-blue-900/10 p-3">
          <p className="text-xs text-gray-400 leading-relaxed">
            <strong className="text-gray-300">Unified Flow</strong> — Claude agents + Dashboard agents merged in one tree.
            Progress is calculated from transcript data in real-time.
            Click the transcript/log buttons on any agent to drill down.
          </p>
        </div>
      )}

      {filtered.length === 0 ? (
        <EmptyState icon={Bot} title="No agents running"
          description="Agents appear here when Claude Code is actively working" />
      ) : (
        <div className="relative space-y-2">
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-0 left-1/4 w-1/2 h-32 bg-accent/5 blur-[80px] rounded-full" />
            <div className="absolute bottom-0 right-1/4 w-1/3 h-24 bg-purple-500/5 blur-[60px] rounded-full" />
          </div>
          {filtered.map((agent, i) => (
            <AgentFlowTree key={agent.id || i} node={agent} depth={0}
              onViewTranscript={onViewTranscript} onViewLogs={onViewLogs} />
          ))}
        </div>
      )}

      {transcriptSessionId && (
        <MiniTranscriptViewer sessionId={transcriptSessionId} onClose={() => setTranscriptSessionId(null)} />
      )}
      {logSessionId && (
        <AgentLogViewer sessionId={logSessionId} onClose={() => setLogSessionId(null)} />
      )}
    </div>
  );
}
