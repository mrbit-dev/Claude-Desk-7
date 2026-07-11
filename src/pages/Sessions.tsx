import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, PlayCircle, XCircle, Trash2, ExternalLink } from 'lucide-react';
import { useSessions, useStopSession, useDeleteSession } from '../hooks/useSessions';
import { SessionCardSkeleton } from '../components/shared/Skeleton';
import { EmptyState } from '../components/shared/EmptyState';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { formatRelativeTime, truncateSessionId } from '../utils/format';
import clsx from 'clsx';
import { SessionSummary } from '../types/claude';

export default function Sessions() {
  const navigate = useNavigate();
  const { data: sessions, isLoading } = useSessions();
  const stopSession = useStopSession();
  const deleteSession = useDeleteSession();

  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = (sessions || []).filter((s) => {
    const matchesSearch =
      !search ||
      s.sessionId.toLowerCase().includes(search.toLowerCase()) ||
      s.display?.toLowerCase().includes(search.toLowerCase()) ||
      s.project?.toLowerCase().includes(search.toLowerCase());

    const matchesFilter =
      filter === 'all' ||
      (filter === 'active' && s.status === 'active') ||
      (filter === 'completed' && s.status !== 'active');

    return matchesSearch && matchesFilter;
  });

  const statusBadge = (status: string) => {
    return (
      <span
        className={clsx(
          'rounded-full px-2 py-0.5 text-xs font-medium',
          status === 'active' && 'bg-green-500/10 text-green-400',
          status === 'completed' && 'bg-blue-500/10 text-blue-400',
          status === 'killed' && 'bg-red-500/10 text-red-400',
          status === 'error' && 'bg-red-500/10 text-red-400'
        )}
      >
        {status}
      </span>
    );
  };

  // Show inline loading indicator instead of blocking the page
  const isLoadingData = isLoading && !sessions;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-100">Sessions</h2>
        <p className="mt-1 text-sm text-gray-500">
          View and manage all Claude Code sessions
        </p>
      </div>

      {/* Loading indicator (skeleton) */}
      {isLoadingData && (
        <div className="grid grid-cols-1 gap-3">
          <SessionCardSkeleton />
          <SessionCardSkeleton />
          <SessionCardSkeleton />
        </div>
      )}

      {/* Search and filters */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-500" />
          <input
            type="text"
            placeholder="Search sessions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-claude-800 bg-claude-900 py-2 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-600 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent/50"
          />
        </div>

        <div className="flex gap-2">
          {(['all', 'active', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={clsx(
                'rounded-lg px-3 py-2 text-sm font-medium transition-colors',
                filter === f
                  ? 'bg-accent/10 text-accent'
                  : 'text-gray-500 hover:bg-claude-800 hover:text-gray-300'
              )}
            >
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Sessions table */}
      <div className="rounded-xl border border-claude-800 bg-claude-900 overflow-hidden">
        {filtered.length === 0 ? (
          <EmptyState
            icon={PlayCircle}
            title="No sessions found"
            description={search ? 'Try a different search term' : 'No Claude Code sessions have been recorded yet'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-claude-800">
                  <th className="px-4 py-3 text-left font-medium text-gray-500">ID</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Name</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Project</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Started</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Status</th>
                  <th className="px-4 py-3 text-left font-medium text-gray-500">Kind</th>
                  <th className="px-4 py-3 text-right font-medium text-gray-500">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-claude-800/50">
                {filtered.map((session: SessionSummary) => (
                  <tr
                    key={session.sessionId}
                    className="transition-colors hover:bg-claude-800/30 cursor-pointer"
                    onClick={() => navigate(`/sessions/${session.sessionId}`)}
                  >
                    <td className="px-4 py-3 font-mono text-xs text-gray-400">
                      {truncateSessionId(session.sessionId)}
                    </td>
                    <td className="px-4 py-3 text-gray-200 max-w-[200px] truncate">
                      {session.display || session.name || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 max-w-[200px] truncate">
                      {session.project || session.cwd || '-'}
                    </td>
                    <td className="px-4 py-3 text-gray-500 whitespace-nowrap">
                      {formatRelativeTime(session.startedAt)}
                    </td>
                    <td className="px-4 py-3">{statusBadge(session.status)}</td>
                    <td className="px-4 py-3 text-gray-500">{session.kind || '-'}</td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/sessions/${session.sessionId}`);
                          }}
                          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-claude-800 hover:text-gray-300"
                          title="View details"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </button>
                        {session.status === 'active' && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              stopSession.mutate(session.sessionId);
                            }}
                            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-900/30 hover:text-red-400"
                            title="Stop session"
                          >
                            <XCircle className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setConfirmDelete(session.sessionId);
                          }}
                          className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-red-900/30 hover:text-red-400"
                          title="Delete session"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="text-xs text-gray-600">
        Showing {filtered.length} of {sessions?.length || 0} sessions
      </p>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete Session"
        message="Are you sure you want to delete this session? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (confirmDelete) {
            deleteSession.mutate(confirmDelete);
            setConfirmDelete(null);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}
