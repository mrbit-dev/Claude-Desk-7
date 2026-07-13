import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Code2, Search, Download, Bot, User, Wrench, CheckCircle2, XCircle, Clock, Terminal } from 'lucide-react';
import { useSession, useTranscript } from '../hooks/useSessions';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { EmptyState } from '../components/shared/EmptyState';
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

  // Build conversation with tool calls grouped
  const timelineItems = useMemo(() => {
    if (!transcript?.lines) return [];

    const items: Array<{
      id: string;
      type: 'user' | 'assistant' | 'tool' | 'result';
      role?: string;
      text?: string;
      toolName?: string;
      toolInput?: any;
      toolResult?: any;
      isError?: boolean;
      timestamp?: string;
      thinking?: string;
    }> = [];

    for (const line of transcript.lines) {
      if (line.type === 'user' && line.message?.content) {
        for (const block of line.message.content) {
          if (block.type === 'text') {
            items.push({
              id: line.uuid,
              type: 'user',
              role: 'User',
              text: block.text,
              timestamp: line.timestamp,
            });
          }
        }
      }

      if (line.type === 'assistant' && line.message?.content) {
        let textParts: string[] = [];
        let thinkingText = '';

        for (const block of line.message.content) {
          if (block.type === 'text') textParts.push(block.text);
          if (block.type === 'thinking') thinkingText = block.thinking;
          if (block.type === 'tool_use') {
            // Flush accumulated text
            if (textParts.length > 0) {
              items.push({
                id: line.uuid + '-text',
                type: 'assistant',
                role: 'Claude',
                text: textParts.join('\n\n'),
                timestamp: line.timestamp,
                thinking: thinkingText,
              });
              textParts = [];
              thinkingText = '';
            }
            items.push({
              id: block.id || line.uuid + '-tool',
              type: 'tool',
              role: 'Claude',
              toolName: block.name,
              toolInput: block.input,
              timestamp: line.timestamp,
            });
          }
          if (block.type === 'tool_result') {
            items.push({
              id: line.uuid + '-result',
              type: 'result',
              toolResult: typeof block.content === 'string' ? block.content.slice(0, 500) : JSON.stringify(block.content).slice(0, 500),
              isError: (block as any).is_error,
              timestamp: line.timestamp,
            });
          }
        }
        // Remaining text
        if (textParts.length > 0) {
          items.push({
            id: line.uuid + '-text-end',
            type: 'assistant',
            role: 'Claude',
            text: textParts.join('\n\n'),
            timestamp: line.timestamp,
            thinking: thinkingText,
          });
        }
      }
    }
    return items;
  }, [transcript]);

  const filteredItems = useMemo(() => {
    if (!searchTerm.trim()) return timelineItems;
    const term = searchTerm.toLowerCase();
    return timelineItems.filter(i => i.text?.toLowerCase().includes(term) || i.toolName?.toLowerCase().includes(term));
  }, [timelineItems, searchTerm]);

  if (sessionLoading) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  if (!session) {
    return <EmptyState icon={Code2} title="Session not found" description="This session could not be found." />;
  }

  return (
    <div className="h-full flex flex-col space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between flex-shrink-0">
        <div className="flex items-center gap-4 min-w-0">
          <button onClick={() => navigate('/sessions')} className="rounded-lg p-2 text-gray-500 hover:bg-claude-800 hover:text-gray-300 flex-shrink-0">
            <ArrowLeft className="h-5 w-5" />
          </button>
          <div className="min-w-0">
            <h2 className="text-xl font-bold text-gray-100 truncate">{session.display || session.name || 'Session Detail'}</h2>
            <p className="mt-0.5 font-mono text-xs text-gray-500">{session.sessionId}</p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className={clsx('text-sm font-medium', { active: 'text-green-400', completed: 'text-blue-400', killed: 'text-red-400', error: 'text-red-400' }[session.status])}>{session.status}</span>
          <button onClick={() => setShowRaw(!showRaw)} className="flex items-center gap-2 rounded-lg border border-claude-800 px-3 py-1.5 text-xs text-gray-500 hover:bg-claude-800 hover:text-gray-300">
            <Code2 className="h-3.5 w-3.5" />{showRaw ? 'Timeline' : 'Raw'}
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

      {/* Search */}
      <div className="flex items-center gap-3 flex-shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-600" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} placeholder="Search in timeline..." className="w-full rounded-lg border border-claude-800 bg-claude-900 py-2 pl-10 pr-4 text-sm text-gray-200 placeholder-gray-600 focus:border-accent focus:outline-none" />
        </div>
        <span className="text-xs text-gray-600">{filteredItems.length} events</span>
      </div>

      {/* Timeline */}
      <div className="flex-1 overflow-hidden rounded-xl border border-claude-800 bg-claude-900">
        <div className="h-full overflow-y-auto p-4">
          {transcriptLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner /></div>
          ) : showRaw ? (
            <pre className="rounded-lg bg-claude-950 p-4 font-mono text-xs text-gray-400 max-h-full overflow-auto">{JSON.stringify(transcript?.lines || [], null, 2)}</pre>
          ) : filteredItems.length === 0 ? (
            <p className="py-16 text-center text-sm text-gray-600">{searchTerm ? 'No matches.' : 'No transcript data.'}</p>
          ) : (
            <div className="relative">
              {/* Vertical timeline line */}
              <div className="absolute left-[23px] top-0 bottom-0 w-px bg-gradient-to-b from-accent/30 via-claude-700 to-claude-800" />

              <div className="space-y-1">
                {filteredItems.map((item, i) => (
                  <div key={item.id + '-' + i} className="relative flex gap-4 pl-3">
                    {/* Timeline dot */}
                    <div className={clsx(
                      'relative z-10 mt-1.5 flex-shrink-0 rounded-full p-1',
                      item.type === 'user' && 'bg-blue-500/20',
                      item.type === 'assistant' && 'bg-accent/20',
                      item.type === 'tool' && 'bg-yellow-500/20',
                      item.type === 'result' && 'bg-green-500/20',
                    )}>
                      {item.type === 'user' && <User className="h-4 w-4 text-blue-400" />}
                      {item.type === 'assistant' && <Bot className="h-4 w-4 text-accent" />}
                      {item.type === 'tool' && <Wrench className="h-4 w-4 text-yellow-400" />}
                      {item.type === 'result' && (item.isError ? <XCircle className="h-4 w-4 text-red-400" /> : <CheckCircle2 className="h-4 w-4 text-green-400" />)}
                    </div>

                    {/* Content */}
                    <div className={clsx(
                      'flex-1 min-w-0 rounded-lg border p-3 mb-1',
                      item.type === 'user' && 'border-blue-800/20 bg-blue-900/5',
                      item.type === 'assistant' && 'border-claude-700 bg-claude-800/30',
                      item.type === 'tool' && 'border-yellow-800/20 bg-yellow-900/10',
                      item.type === 'result' && 'border-green-800/20 bg-green-900/5',
                    )}>
                      {/* Header */}
                      <div className="flex items-center gap-2 mb-1.5">
                        <span className={clsx(
                          'text-[10px] font-semibold uppercase tracking-wider',
                          item.type === 'user' && 'text-blue-400',
                          item.type === 'assistant' && 'text-accent',
                          item.type === 'tool' && 'text-yellow-400',
                          item.type === 'result' && 'text-green-400',
                        )}>{item.role || item.type}</span>
                        {item.toolName && <span className="text-[10px] font-mono text-gray-500">🔧 {item.toolName}</span>}
                        {item.timestamp && <span className="text-[10px] text-gray-700 ml-auto"><Clock className="h-3 w-3 inline mr-0.5" />{new Date(item.timestamp).toLocaleTimeString()}</span>}
                      </div>

                      {/* Thinking expandable */}
                      {item.thinking && (
                        <details className="mb-2">
                          <summary className="text-[10px] text-gray-600 cursor-pointer hover:text-gray-400">🤔 Thinking</summary>
                          <p className="mt-1 text-[11px] text-gray-500 italic whitespace-pre-wrap">{item.thinking.slice(0, 500)}</p>
                        </details>
                      )}

                      {/* Text */}
                      {item.text && <p className="text-sm text-gray-200 whitespace-pre-wrap leading-relaxed">{item.text}</p>}

                      {/* Tool input */}
                      {item.toolInput && (
                        <details className="mt-1">
                          <summary className="text-[10px] text-gray-600 cursor-pointer hover:text-gray-400">📦 Input</summary>
                          <pre className="mt-1 text-[10px] text-gray-400 bg-claude-950 p-2 rounded overflow-x-auto">{JSON.stringify(item.toolInput, null, 2).slice(0, 2000)}</pre>
                        </details>
                      )}

                      {/* Tool result */}
                      {item.toolResult && (
                        <details className="mt-1">
                          <summary className="text-[10px] text-gray-600 cursor-pointer hover:text-gray-400">📋 Result{item.isError ? ' ⚠️ Error' : ''}</summary>
                          <pre className={clsx('mt-1 text-[10px] bg-claude-950 p-2 rounded overflow-x-auto', item.isError ? 'text-red-300' : 'text-gray-400')}>{item.toolResult}</pre>
                        </details>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
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
