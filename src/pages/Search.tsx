import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search as SearchIcon, MessageSquare, Clock } from 'lucide-react';
import { formatRelativeTime } from '../utils/format';

interface SearchResult {
  sessionId: string;
  project: string;
  timestamp: number;
  snippet: string;
  role: string;
}

export default function SearchPage() {
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const res = await fetch(`/api/sessions/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch {
      setResults([]);
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-100">Smart Search</h2>
        <p className="mt-1 text-sm text-gray-500">Tìm kiếm xuyên suốt tất cả sessions, transcripts, tool calls</p>
      </div>

      {/* Search input */}
      <div className="relative max-w-2xl">
        <SearchIcon className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
          placeholder="Search anything — code, errors, questions, tool names..."
          className="w-full rounded-xl border border-claude-700 bg-claude-900 py-4 pl-12 pr-4 text-base text-gray-200 placeholder-gray-600 focus:border-accent focus:outline-none"
          autoFocus
        />
      </div>

      {/* Results */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="flex items-center gap-2 text-gray-500">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent border-t-transparent" />
            <span className="text-sm">Searching...</span>
          </div>
        </div>
      )}

      {!loading && searched && results.length === 0 && (
        <div className="flex flex-col items-center justify-center py-16 text-gray-600">
          <SearchIcon className="h-12 w-12 mb-4" />
          <p className="text-sm">No results found for "<strong className="text-gray-400">{query}</strong>"</p>
        </div>
      )}

      {results.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs text-gray-600">{results.length} results</p>
          {results.map((r, i) => (
            <button
              key={i}
              onClick={() => navigate(`/sessions/${r.sessionId}`)}
              className="w-full text-left rounded-xl border border-claude-800 bg-claude-900 p-4 hover:border-accent/30 transition-all hover:shadow-[0_0_10px_rgba(168,130,255,0.1)]"
            >
              <div className="flex items-start gap-3">
                <MessageSquare className="h-5 w-5 text-accent mt-0.5 flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-xs font-medium text-gray-400 bg-claude-800 px-1.5 py-0.5 rounded">{r.role}</span>
                    <span className="text-xs text-gray-600 font-mono">{r.sessionId.slice(0, 8)}...</span>
                    {r.project && <span className="text-xs text-gray-700">📁 {r.project}</span>}
                    <span className="text-xs text-gray-700 flex items-center gap-1"><Clock className="h-3 w-3" />{formatRelativeTime(r.timestamp)}</span>
                  </div>
                  <p className="mt-1.5 text-sm text-gray-300 leading-relaxed line-clamp-3">{r.snippet}</p>
                </div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
