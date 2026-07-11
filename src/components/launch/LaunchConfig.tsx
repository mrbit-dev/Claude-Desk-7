import { useState, useEffect, useRef, useCallback } from 'react';
import { FolderOpen, ChevronRight, ChevronDown, HardDrive, ArrowUp, Loader2 } from 'lucide-react';
import clsx from 'clsx';

interface DirEntry {
  name: string;
  path: string;
}

interface BrowseResult {
  path: string;
  parent: string | null;
  entries: DirEntry[];
  isDrive: boolean;
}

interface LaunchConfigProps {
  model: string;
  effort: string;
  cwd: string;
  onModelChange: (v: string) => void;
  onEffortChange: (v: string) => void;
  onCwdChange: (v: string) => void;
}

function DirBrowser({ onSelect, onClose }: { onSelect: (path: string) => void; onClose: () => void }) {
  const [currentPath, setCurrentPath] = useState('');
  const [entries, setEntries] = useState<DirEntry[]>([]);
  const [parent, setParent] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDrive, setIsDrive] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const loadPath = useCallback(async (path: string) => {
    setLoading(true);
    try {
      const params = path ? `?path=${encodeURIComponent(path)}` : '';
      const res = await fetch(`/api/files/browse${params}`);
      const data: BrowseResult = await res.json();
      setCurrentPath(data.path);
      setParent(data.parent);
      setEntries(data.entries);
      setIsDrive(data.isDrive);
    } catch {
      setEntries([]);
    }
    setLoading(false);
  }, []);

  // Load drives initially
  useEffect(() => { loadPath(''); }, [loadPath]);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = 0;
    }
  }, [entries]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-lg mx-4 rounded-xl border border-claude-700 bg-claude-900 shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-claude-800 px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <FolderOpen className="h-4 w-4 text-accent flex-shrink-0" />
            <span className="text-sm font-semibold text-gray-200 truncate">Chọn thư mục làm việc</span>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-500 hover:bg-claude-800 hover:text-gray-300 transition-colors">
            <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd"/></svg>
          </button>
        </div>

        {/* Current path */}
        <div className="flex items-center gap-2 border-b border-claude-800 px-4 py-2 bg-claude-950/50">
          {parent && (
            <button
              onClick={() => loadPath(parent)}
              className="rounded p-0.5 text-gray-500 hover:text-gray-300 transition-colors"
              title="Thư mục cha"
            >
              <ArrowUp className="h-3.5 w-3.5" />
            </button>
          )}
          <p className="text-xs text-gray-400 font-mono truncate">
            {currentPath || 'Máy tính'}
          </p>
        </div>

        {/* Directory listing */}
        <div ref={containerRef} className="max-h-64 overflow-y-auto p-2 space-y-0.5">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-5 w-5 text-gray-500 animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <p className="text-center py-6 text-xs text-gray-600">
              {isDrive ? 'Không tìm thấy ổ đĩa nào' : 'Thư mục trống'}
            </p>
          ) : (
            entries.map((entry) => (
              <button
                key={entry.path}
                onClick={() => {
                  if (isDrive) {
                    loadPath(entry.path);
                  } else {
                    setSelectedPath(entry.path);
                  }
                }}
                onDoubleClick={() => {
                  if (!isDrive) loadPath(entry.path);
                }}
                className={clsx(
                  'flex items-center gap-2 w-full rounded-lg px-3 py-2 text-xs transition-colors text-left',
                  selectedPath === entry.path
                    ? 'bg-accent/15 text-accent border border-accent/30'
                    : 'text-gray-400 hover:bg-claude-800 hover:text-gray-200 border border-transparent'
                )}
              >
                {isDrive ? (
                  <HardDrive className="h-4 w-4 text-blue-400" />
                ) : (
                  <FolderOpen className="h-4 w-4 text-yellow-500" />
                )}
                <span className="flex-1 truncate">{entry.name}</span>
                {!isDrive && (
                  <ChevronRight className="h-3 w-3 text-gray-600 flex-shrink-0" />
                )}
              </button>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-claude-800 px-4 py-3 flex items-center justify-between gap-3">
          <p className="text-[10px] text-gray-600 flex-1 truncate" title={selectedPath || currentPath}>
            {selectedPath || currentPath || 'Chưa chọn thư mục'}
            {!isDrive && selectedPath && (
              <button
                onClick={() => loadPath(selectedPath)}
                className="ml-1 text-accent hover:text-accent-light"
              >
                [mở]
              </button>
            )}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-claude-700 px-3 py-1.5 text-xs text-gray-500 hover:bg-claude-800 transition-colors"
            >
              Huỷ
            </button>
            <button
              onClick={() => {
                if (selectedPath) onSelect(selectedPath);
              }}
              disabled={!selectedPath && isDrive}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-dark disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Chọn
            </button>
          </div>
        </div>

        <div className="px-4 pb-2 text-[10px] text-gray-700">
          💡 Click để chọn, double-click để mở thư mục
        </div>
      </div>
    </div>
  );
}

export function LaunchConfig({
  model, effort, cwd,
  onModelChange, onEffortChange, onCwdChange,
}: LaunchConfigProps) {
  const [showBrowser, setShowBrowser] = useState(false);

  return (
    <>
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-gray-300">Cấu hình</h3>

        {/* Giải thích Launch */}
        <div className="rounded-lg bg-claude-950 border border-claude-800 p-3">
          <p className="text-[10px] text-gray-500 leading-relaxed">
            🚀 Launch giúp bạn gửi câu hỏi đến <strong className="text-gray-400">Claude Code</strong> và xem kết quả realtime ngay trên dashboard, không cần mở terminal.
          </p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Model</label>
          <p className="text-[10px] text-gray-600 mb-1.5">Chọn model Claude Code sẽ dùng cho session này</p>
          <select
            value={model}
            onChange={(e) => onModelChange(e.target.value)}
            className="w-full rounded-lg border border-claude-700 bg-claude-950 px-3 py-2 text-sm text-gray-200 focus:border-accent focus:outline-none"
          >
            <option value="">Mặc định</option>
            <option value="claude-opus-4-8">Claude Opus 4.8 — Mạnh nhất</option>
            <option value="claude-fable-5">Claude Fable 5 — Mới nhất</option>
            <option value="claude-sonnet-5">Claude Sonnet 5 — Cân bằng</option>
            <option value="claude-haiku-4-5-20251001">Claude Haiku 4.5 — Nhanh</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Effort Level</label>
          <p className="text-[10px] text-gray-600 mb-1.5">Mức độ suy nghĩ của Claude — càng cao càng kỹ nhưng chậm hơn</p>
          <select
            value={effort}
            onChange={(e) => onEffortChange(e.target.value)}
            className="w-full rounded-lg border border-claude-700 bg-claude-950 px-3 py-2 text-sm text-gray-200 focus:border-accent focus:outline-none"
          >
            <option value="">Mặc định</option>
            <option value="low">Low — Nhanh</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
            <option value="xhigh">Extra High</option>
            <option value="max">Maximum — Kỹ nhất</option>
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-400 mb-1">Working Directory</label>
          <p className="text-[10px] text-gray-600 mb-1.5">Thư mục Claude Code sẽ chạy trong đó. Bấm nút 📁 để duyệt.</p>
          <div className="flex gap-1.5">
            <input
              type="text"
              value={cwd}
              onChange={(e) => onCwdChange(e.target.value)}
              placeholder="E:\laragon\www\project (để trống dùng mặc định)"
              className="flex-1 rounded-lg border border-claude-700 bg-claude-950 px-3 py-2 text-sm text-gray-200 placeholder-gray-700 focus:border-accent focus:outline-none"
            />
            <button
              onClick={() => setShowBrowser(true)}
              className="rounded-lg border border-claude-700 px-2.5 py-2 text-gray-500 hover:bg-claude-800 hover:text-gray-300 transition-colors"
              title="Duyệt thư mục"
            >
              <FolderOpen className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      {showBrowser && (
        <DirBrowser
          onSelect={(path) => {
            onCwdChange(path);
            setShowBrowser(false);
          }}
          onClose={() => setShowBrowser(false)}
        />
      )}
    </>
  );
}
