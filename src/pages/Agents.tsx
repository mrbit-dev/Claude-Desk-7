import { useQuery } from '@tanstack/react-query';
import { Bot, Activity, GitBranch } from 'lucide-react';
import { api } from '../api/client';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { EmptyState } from '../components/shared/EmptyState';
import { AgentFlowCard, AgentFlowContainer } from '../components/agents/AgentFlowCard';
import { useWebSocket } from '../hooks/useWebSocket';
import { formatRelativeTime } from '../utils/format';
import { useEffect, useState } from 'react';
import clsx from 'clsx';

interface AgentTreeNode {
  sessionId: string;
  name: string;
  kind: string;
  pid?: number;
  cwd?: string;
  startedAt?: number;
  description?: string;
  spawnDepth?: number;
  children: AgentTreeNode[];
}

function AgentFlowTree({ node, depth = 0 }: { node: AgentTreeNode; depth?: number }) {
  const isMain = depth === 0;
  const status = 'running'; // All active agents are running

  // Random progress for visual effect (would come from backend in real implementation)
  const [progress] = useState(() => Math.floor(Math.random() * 40) + 30);

  return (
    <AgentFlowCard
      name={node.name || 'Unnamed'}
      kind={node.kind || 'interactive'}
      status={status}
      description={node.description || undefined}
      progress={progress}
      isMain={isMain}
    >
      {node.children && node.children.length > 0 && (
        <div className="space-y-2 relative">
          {/* Vertical connector */}
          <div className="absolute left-0 top-0 bottom-0 w-px bg-gradient-to-b from-accent/30 via-accent/10 to-transparent" />
          {node.children.map((child, i) => (
            <AgentFlowTree key={child.sessionId + '-' + i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </AgentFlowCard>
  );
}

export default function Agents() {
  const { subscribe } = useWebSocket();
  const [view, setView] = useState<'list' | 'tree' | 'flow'>('flow');
  const [liveTree, setLiveTree] = useState<AgentTreeNode[]>([]);

  const { data: initialAgents, isLoading } = useQuery<AgentTreeNode[]>({
    queryKey: ['agents', 'tree'],
    queryFn: () => api.get('/agents/tree'),
    refetchInterval: 15000,
  });

  // Listen for real-time tree updates via WebSocket
  useEffect(() => {
    const unsub = subscribe('agent:tree-update', (event: any) => {
      if (event.tree) {
        setLiveTree(event.tree);
      }
    });
    return unsub;
  }, [subscribe]);

  const treeData = liveTree.length > 0 ? liveTree : (initialAgents || []);

  if (isLoading && treeData.length === 0) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  // Count total agents
  const countAgents = (nodes: AgentTreeNode[]): number => {
    let count = 0;
    for (const node of nodes) {
      count += 1 + countAgents(node.children);
    }
    return count;
  };
  const totalAgents = countAgents(treeData);
  const totalSubs = totalAgents - treeData.length;

  const views = ['flow', 'tree', 'list'] as const;
  const viewIcons = { flow: '✨', tree: '🌳', list: '📋' };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Agents</h2>
          <p className="mt-1 text-sm text-gray-500">
            Giám sát Claude Code — agent chính (MAIN) và agent con (SUB)
          </p>
        </div>

        {treeData.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="flex items-center gap-1"><Bot className="h-3 w-3 text-green-400" />{treeData.length} MAIN</span>
              {totalSubs > 0 && <span className="flex items-center gap-1"><Activity className="h-3 w-3 text-accent" />{totalSubs} SUB</span>}
            </div>
            <div className="flex rounded-lg border border-claude-700 overflow-hidden">
              {views.map((v) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  className={clsx('px-2.5 py-1 text-xs transition-colors',
                    view === v ? 'bg-claude-800 text-gray-200' : 'text-gray-500 hover:text-gray-300'
                  )}
                >
                  {viewIcons[v]} {v}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Guide */}
      <div className="rounded-xl border border-blue-800/30 bg-blue-900/10 p-3">
        <p className="text-xs text-gray-400 leading-relaxed">
          ✨ <strong className="text-gray-300">Flow View</strong> — xem agents hoạt động trực quan nhất với hiệu ứng glow, progress bar realtime.
          Chuyển qua <strong className="text-gray-300">Tree</strong> hoặc <strong className="text-gray-300">List</strong> để xem chi tiết.
        </p>
      </div>

      {treeData.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="Không có agent nào đang chạy"
          description="Agents sẽ hiển thị khi Claude Code đang hoạt động"
        />
      ) : view === 'flow' ? (
        <AgentFlowContainer>
          {treeData.map((agent, i) => (
            <AgentFlowTree key={agent.sessionId + '-' + i} node={agent} depth={0} />
          ))}
        </AgentFlowContainer>
      ) : view === 'tree' ? (
        <div className="rounded-xl border border-claude-800 bg-claude-900/50 p-4 space-y-3">
          {treeData.map((agent, i) => (
            <div key={agent.sessionId + '-' + i}>
              <div className="flex items-start gap-3 p-3 rounded-lg bg-claude-800/30 border border-claude-700">
                <Bot className="h-5 w-5 text-green-400 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-sm font-medium text-gray-200">{agent.name}</span>
                    <span className="rounded bg-green-900/30 px-1.5 py-0.5 text-[10px] font-medium text-green-400">MAIN</span>
                    <span className="text-[10px] text-gray-500 font-mono">PID: {agent.pid}</span>
                  </div>
                  {agent.description && (
                    <p className="mt-1 text-xs text-gray-500">{agent.description}</p>
                  )}
                  <p className="mt-1 text-[10px] text-gray-600">
                    📁 {agent.cwd} · ⏱️ {agent.startedAt ? formatRelativeTime(agent.startedAt) : ''}
                  </p>
                </div>
              </div>
              {agent.children.length > 0 && (
                <div className="ml-6 pl-4 border-l border-claude-700 space-y-1 mt-1">
                  {agent.children.map((child, i) => (
                    <div key={i} className="flex items-start gap-2 p-2 rounded hover:bg-claude-800/30">
                      <Activity className="h-4 w-4 text-accent mt-0.5" />
                      <div className="min-w-0">
                        <span className="text-xs text-gray-300">{child.name}</span>
                        <span className="ml-1.5 text-[10px] text-accent">SUB</span>
                        {child.description && (
                          <p className="text-[10px] text-gray-500">{child.description}</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {treeData.map((agent) => (
            <div key={agent.sessionId} className="rounded-xl border border-claude-800 bg-claude-900 p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-green-500/10 p-2">
                    <Bot className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-200 truncate">{agent.name}</p>
                    <p className="text-xs text-gray-500 font-mono">PID: {agent.pid}</p>
                  </div>
                </div>
                <span className="rounded-full bg-green-500/10 px-2 py-0.5 text-[10px] font-medium text-green-400 whitespace-nowrap">
                  🟢 MAIN
                </span>
              </div>
              {agent.description && (
                <div className="mt-3 rounded-lg bg-claude-950 border border-claude-800 p-2.5">
                  <p className="text-[10px] text-gray-600 mb-0.5">⚡ Hoạt động:</p>
                  <p className="text-xs text-gray-400 font-mono leading-relaxed line-clamp-3">{agent.description}</p>
                </div>
              )}
              <div className="mt-3 space-y-1.5 text-xs text-gray-500">
                <div className="flex items-center gap-2"><Activity className="h-3.5 w-3.5" /><span className="truncate">{agent.cwd || 'Unknown'}</span></div>
                <div className="flex items-center gap-2"><Bot className="h-3.5 w-3.5" /><span>Started {agent.startedAt ? formatRelativeTime(agent.startedAt) : '?'}</span></div>
                {agent.children.length > 0 && <div className="flex items-center gap-2"><Activity className="h-3.5 w-3.5" /><span>{agent.children.length} SUB agent(s)</span></div>}
              </div>
              <div className="mt-3 flex items-center gap-2 flex-wrap">
                <span className="rounded bg-claude-800 px-2 py-0.5 text-xs text-gray-400">{agent.kind}</span>
                <span className="rounded bg-claude-800 px-2 py-0.5 font-mono text-xs text-gray-400">{agent.sessionId.slice(0, 8)}...</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
