import { useQuery } from '@tanstack/react-query';
import { Bot, Cpu, Clock, ChevronRight, ChevronDown, GitBranch, Activity, MessageSquare, Layers } from 'lucide-react';
import { api } from '../api/client';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { EmptyState } from '../components/shared/EmptyState';
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

function AgentTreeItem({ node, depth = 0 }: { node: AgentTreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isMain = depth === 0;

  return (
    <div>
      <div className={clsx(
        'rounded-lg border transition-colors',
        isMain
          ? 'border-claude-700 bg-claude-800/50 p-4'
          : 'border-transparent hover:bg-claude-800/30 p-2.5'
      )}>
        <div className="flex items-start gap-2.5">
          {/* Expand/collapse */}
          {hasChildren ? (
            <button onClick={() => setExpanded(!expanded)} className="mt-1 text-gray-500 hover:text-gray-300 flex-shrink-0">
              {expanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
            </button>
          ) : (
            <span className="w-3.5 flex-shrink-0" />
          )}

          {/* Agent icon */}
          <div className={clsx(
            'rounded-full p-1.5 flex-shrink-0',
            isMain ? 'bg-green-500/20' : 'bg-accent/20'
          )}>
            {isMain
              ? <Bot className="h-4 w-4 text-green-400" />
              : <Layers className="h-3.5 w-3.5 text-accent" />
            }
          </div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            {/* Header: name + badges */}
            <div className="flex items-center gap-2 flex-wrap">
              <span className={clsx('font-medium', isMain ? 'text-sm text-gray-100' : 'text-xs text-gray-300')}>
                {node.name}
              </span>

              {/* Role badge */}
              <span className={clsx(
                'rounded px-1.5 py-0.5 text-[10px] font-medium',
                isMain ? 'bg-green-900/30 text-green-400' : 'bg-accent/15 text-accent'
              )}>
                {isMain ? '🟢 MAIN' : '🔵 SUB'}
              </span>

              {/* Kind badge */}
              <span className="rounded bg-claude-800 px-1.5 py-0.5 text-[10px] text-gray-500 font-mono">
                {node.kind}
              </span>

              {/* PID for main */}
              {isMain && node.pid && (
                <span className="text-[10px] text-gray-600 font-mono">PID: {node.pid}</span>
              )}

              {/* Active badge for main */}
              {isMain && (
                <span className="flex items-center gap-1 rounded-full bg-green-500/10 px-1.5 py-0.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-green-500 animate-pulse" />
                  <span className="text-[10px] text-green-400">Active</span>
                </span>
              )}
            </div>

            {/* Current activity */}
            {node.description && (
              <div className={clsx(
                'mt-1.5 rounded px-2 py-1 font-mono leading-relaxed',
                isMain ? 'bg-claude-950 border border-claude-700 text-[11px] text-gray-400' : 'text-[10px] text-gray-500 italic'
              )}>
                <span className="text-gray-600 mr-1">⚡</span>
                {node.description}
              </div>
            )}

            {/* Meta info for main agents */}
            {isMain && (
              <div className="mt-2 flex items-center gap-3 text-[10px] text-gray-600 flex-wrap">
                {node.cwd && <span title={node.cwd}>📁 {node.cwd}</span>}
                {node.startedAt && <span>⏱️ {formatRelativeTime(node.startedAt)}</span>}
                <span className="font-mono">🆔 {node.sessionId.slice(0, 8)}...</span>
              </div>
            )}

            {/* Sub count badge */}
            {hasChildren && !expanded && (
              <p className="text-[10px] text-gray-600 mt-1">
                {node.children.length} sub-agent{node.children.length > 1 ? 's' : ''}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Children (sub-agents) */}
      {expanded && hasChildren && (
        <div className="ml-6 pl-4 border-l border-claude-700 space-y-1 mt-1.5">
          {node.children.map((child, i) => (
            <AgentTreeItem key={child.sessionId + '-' + i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export default function Agents() {
  const { subscribe } = useWebSocket();
  const [view, setView] = useState<'list' | 'tree'>('tree');
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

  // Count total agents (including sub-agents)
  const countAgents = (nodes: AgentTreeNode[]): number => {
    let count = 0;
    for (const node of nodes) {
      count += 1 + countAgents(node.children);
    }
    return count;
  };
  const totalAgents = countAgents(treeData);
  const totalSubs = totalAgents - treeData.length;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Agents</h2>
          <p className="mt-1 text-sm text-gray-500">
            Giám sát Claude Code — agent chính (MAIN) và agent con (SUB) được spawn ra
          </p>
        </div>

        {treeData.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-gray-600">
              <span className="flex items-center gap-1"><Bot className="h-3 w-3 text-green-400" />{treeData.length} MAIN</span>
              {totalSubs > 0 && <span className="flex items-center gap-1"><Layers className="h-3 w-3 text-accent" />{totalSubs} SUB</span>}
            </div>
            <div className="flex rounded-lg border border-claude-700 overflow-hidden">
              <button
                onClick={() => setView('list')}
                className={clsx('px-2.5 py-1 text-xs transition-colors',
                  view === 'list' ? 'bg-claude-800 text-gray-200' : 'text-gray-500 hover:text-gray-300'
                )}
              >
                <Activity className="h-3.5 w-3.5" />
              </button>
              <button
                onClick={() => setView('tree')}
                className={clsx('px-2.5 py-1 text-xs transition-colors',
                  view === 'tree' ? 'bg-claude-800 text-gray-200' : 'text-gray-500 hover:text-gray-300'
                )}
              >
                <GitBranch className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Guide */}
      <div className="rounded-xl border border-blue-800/30 bg-blue-900/10 p-3">
        <p className="text-xs text-gray-400 leading-relaxed">
          📋 <strong className="text-gray-300">Agents</strong> là các phiên Claude Code đang chạy.
          Mỗi agent MAIN có thể spawn ra <strong className="text-gray-300">SUB agents</strong> để xử lý tác vụ song song.
        </p>
        <ul className="mt-1.5 text-[10px] text-gray-500 space-y-0.5">
          <li>🟢 <strong className="text-gray-400">MAIN</strong> — Agent chính, phiên Claude Code bạn đang tương tác</li>
          <li>🔵 <strong className="text-gray-400">SUB</strong> — Agent con được spawn ra từ agent chính (hoặc từ sub khác)</li>
          <li className="truncate">⚡ <strong className="text-gray-400">Hoạt động gần nhất</strong> — câu hỏi / tool call / trả lời từ transcript</li>
        </ul>
      </div>

      {treeData.length === 0 ? (
        <EmptyState
          icon={Bot}
          title="Không có agent nào đang chạy"
          description="Agents sẽ hiển thị khi Claude Code đang hoạt động"
        />
      ) : view === 'tree' ? (
        <div className="space-y-2">
          {treeData.map((agent, i) => (
            <AgentTreeItem key={agent.sessionId + '-' + i} node={agent} depth={0} />
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

              {/* Current activity */}
              {agent.description && (
                <div className="mt-3 rounded-lg bg-claude-950 border border-claude-800 p-2.5">
                  <p className="text-[10px] text-gray-600 mb-0.5">⚡ Hoạt động:</p>
                  <p className="text-xs text-gray-400 font-mono leading-relaxed line-clamp-3">{agent.description}</p>
                </div>
              )}

              <div className="mt-3 space-y-1.5 text-xs text-gray-500">
                <div className="flex items-center gap-2">
                  <Cpu className="h-3.5 w-3.5" />
                  <span className="truncate">{agent.cwd || 'Unknown'}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Clock className="h-3.5 w-3.5" />
                  <span>Started {agent.startedAt ? formatRelativeTime(agent.startedAt) : '?'}</span>
                </div>
                {agent.children.length > 0 && (
                  <div className="flex items-center gap-2">
                    <Layers className="h-3.5 w-3.5" />
                    <span>🔵 {agent.children.length} SUB agent{agent.children.length > 1 ? 's' : ''}</span>
                  </div>
                )}
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
