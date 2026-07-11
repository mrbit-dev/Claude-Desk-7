import { PlayCircle, CheckCircle, XCircle } from 'lucide-react';
import clsx from 'clsx';
import { SessionSummary } from '../../types/claude';
import { formatRelativeTime } from '../../utils/format';

interface SessionCardProps {
  session: SessionSummary;
  onClick?: () => void;
}

export function SessionCard({ session, onClick }: SessionCardProps) {
  const statusColor = {
    active: 'text-green-400',
    completed: 'text-blue-400',
    killed: 'text-red-400',
    error: 'text-red-400',
  }[session.status];

  const StatusIcon = session.status === 'active' ? PlayCircle : CheckCircle;

  return (
    <button
      onClick={onClick}
      className="card-hover w-full rounded-xl border border-claude-800 bg-claude-900 p-4 text-left transition-colors hover:bg-claude-800/50"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-gray-200">
            {session.display || session.name || 'Untitled session'}
          </p>
          <p className="mt-0.5 truncate text-xs text-gray-500">
            {session.sessionId.slice(0, 8)}...
          </p>
        </div>
        <div className={clsx('ml-2', statusColor)}>
          <StatusIcon className="h-4 w-4" />
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3 text-xs text-gray-500">
        <span>
          {formatRelativeTime(session.startedAt)}
        </span>
        <span className="text-claude-600">·</span>
        <span className="truncate max-w-[200px]">{session.project || session.cwd}</span>
      </div>

      {session.kind && (
        <div className="mt-2">
          <span className="rounded bg-claude-800 px-1.5 py-0.5 text-xs text-gray-400">
            {session.kind}
          </span>
        </div>
      )}
    </button>
  );
}
