import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Code2, Search, Download, ChevronDown, ChevronRight } from 'lucide-react';
import { useSession, useTranscript } from '../hooks/useSessions';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { EmptyState } from '../components/shared/EmptyState';
import { MessageBubble } from '../components/transcripts/MessageBubble';
import { formatRelativeTime, formatTimestamp } from '../utils/format';
import clsx from 'clsx';
import { useState, useMemo } from 'react';

export default function SessionDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: session, isLoading: sessionLoading } = useSession(id!);
  const { data: transcript, isLoading: transcriptLoading } = useTranscript(id!, 500);

  const [showRaw, setShowRaw] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedAll, setExpandedAll] = useState(false);

  // Build conversation tree from parentUuid links
  const conversationMessages = useMemo(() => {
    if (!transcript?.lines) return [];

    const messages: Array<{
      uuid: string;
      role: 'user' | 'assistant';
      content: any[];
      timestamp: string;
      parentUuid: string | null;
    }> = [];

    for (const line of transcript.lines) {
      if ((line.type === 'user' || line.type === 'assistant') && line.message?.content) {
        messages.push({
          uuid: line.uuid,
          role: line.message.role,
          content: line.message.content,
          timestamp: line.timestamp || '',
          parentUuid: line.parentUuid || null,
        });
      }
    }

    // Sort by UUID timestamp order (they're already in order from JSONL)
    return messages;
  }, [transcript]);

  // Filter by search
  const filteredMessages = useMemo(() => {
    if (!searchTerm.trim()) return conversationMessages;
    const term = searchTerm.toLowerCase();
    return conversationMessages.filter(m =>
      m.content.some((c: any) =>
        c.type === 'text' && c.text.toLowerCase().includes(term)
      )
    );
  }, [conversationMessages, searchTerm]);

  // Export transcript
  const handleExport = (format: 'jsonl' | 'txt') => {
    if (!transcript?.lines) return;
    let content: string;
    let mime: string;
    let ext: string;

    if (format === 'jsonl') {
      content = transcript.lines.map(l => JSON.stringify(l)).join('\n');
      mime = 'application/jsonl';
      ext = 'jsonl';
    } else {
      content = transcript.lines
        .filter(l => l.message?.content)
        .map(l => {
          const role = l.message?.role || l.type;
          const text = l.message?.content
            ?.filter((c: any) => c.type === 'text')
            .map((c: any) => c.text)
            .join('\n') || '';
          return `[${role.toUpperCase()}] ${text}`;
        })
        .join('\n\n---\n\n');
      mime = 'text/plain';
      ext = 'txt';
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `transcript-${id?.slice(0, 8)}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (sessionLoading) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  if (!session) {
    return (
      <EmptyState
        icon={Code2}
        title="Session not found"
        description="This session could not be found or its data has been purged."
      />
    );
  }

  const statusColor = {
    active: 'text-green-400',
    completed: 'text-blue-400',
    killed: 'text-red-400',
    error: 'text-red-400',
  }[session.status];

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <button
            onClick={() => navigate('/sessions')}
            className="rounded-lg p-2 text-gray-500 transition-colors hover:bg-claude-800 hover:text-gray-300 flex-shrink-0"
          >
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-100 truncate">
              {session.display || session.name || 'Session Detail'}
            </h2>
            <p className="mt-0.5 font-mono text-xs text-gray-500 truncate">
              {session.sessionId}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={clsx('text-sm font-medium', statusColor)}>
            {session.status}
          </span>

          {/* Export button */}
          <div className="relative group">
            <button className="rounded-lg border border-claude-800 p-1.5 text-gray-500 hover:bg-claude-800 hover:text-gray-300 transition-colors">
              <Download className="h-3.5 w-3.5" />
            </button>
            <div className="absolute right-0 top-full mt-1 hidden group-hover:block z-50">
              <div className="rounded-lg border border-claude-700 bg-claude-900 py-1 shadow-xl min-w-[120px]">
                <button onClick={() => handleExport('jsonl')} className="block w-full px-3 py-1.5 text-xs text-gray-400 hover:bg-claude-800 hover:text-gray-200 text-left">
                  Export JSONL
                </button>
                <button onClick={() => handleExport('txt')} className="block w-full px-3 py-1.5 text-xs text-gray-400 hover:bg-claude-800 hover:text-gray-200 text-left">
                  Export TXT
                </button>
              </div>
            </div>
          </div>

          <button
            onClick={() => setShowRaw(!showRaw)}
            className="flex items-center gap-2 rounded-lg border border-claude-800 px-3 py-1.5 text-xs text-gray-500 hover:bg-claude-800 hover:text-gray-300 transition-colors"
          >
            <Code2 className="h-3.5 w-3.5" />
            {showRaw ? 'Parsed' : 'Raw'}
          </button>
        </div>
      </div>

      {/* Metadata */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 flex-shrink-0">
        <MetaCard label="Started" value={formatTimestamp(session.startedAt)} />
        <MetaCard label="Duration" value={session.duration ? `${(session.duration / 1000).toFixed(1)}s` : '-'} />
        <MetaCard label="Kind" value={session.kind || '-'} />
        <MetaCard label="Project" value={session.project || session.cwd || '-'} />
      </div>

      {/* Search bar */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search in transcript..."
            className="w-full rounded-lg border border-claude-800 bg-claude-900 py-2 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-600 focus:border-accent focus:outline-none"
          />
        </div>
        <span className="text-xs text-gray-600">
          {filteredMessages.length} / {conversationMessages.length} messages
        </span>
      </div>

      {/* Transcript */}
      <div className="flex-1 overflow-hidden rounded-xl border border-claude-800 bg-claude-900">
        <div className="h-full overflow-y-auto p-4 space-y-3">
          {transcriptLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner /></div>
          ) : showRaw ? (
            <pre className="overflow-auto rounded-lg bg-claude-950 p-4 font-mono text-xs text-gray-400 max-h-full">
              {JSON.stringify(transcript?.lines || [], null, 2)}
            </pre>
          ) : filteredMessages.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-600">
              {searchTerm ? 'No messages match your search.' : 'No transcript data available.'}
            </p>
          ) : (
            filteredMessages.map((msg) => (
              <MessageBubble
                key={msg.uuid}
                role={msg.role}
                content={msg.content}
                timestamp={msg.timestamp}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function MetaCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-claude-800 bg-claude-900 p-3">
      <p className="text-[10px] uppercase tracking-wider text-gray-600">{label}</p>
      <p className="mt-0.5 text-sm text-gray-200 truncate" title={value}>{value}</p>
    </div>
  );
}
