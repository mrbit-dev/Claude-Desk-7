import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FolderOpen, Trash2, HardDrive, Terminal, FileText, Clock, Database, Activity } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';
import { ProjectSummary } from '../types/claude';
import { ProjectCardSkeleton } from '../components/shared/Skeleton';
import { EmptyState } from '../components/shared/EmptyState';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { formatRelativeTime, formatBytes } from '../utils/format';
import toast from 'react-hot-toast';

export default function Projects() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: projects, isLoading } = useQuery<ProjectSummary[]>({
    queryKey: ['projects'],
    queryFn: () => api.get('/projects'),
  });

  const [confirmPurge, setConfirmPurge] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  const purgeMutation = useMutation({
    mutationFn: (slug: string) => api.delete(`/projects/${slug}?purgeSessions=true`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      toast.success('Đã xoá dữ liệu project');
    },
    onError: () => toast.error('Xoá thất bại'),
  });

  // Thống kê tổng quan
  const totalSessions = projects?.reduce((sum, p) => sum + p.sessionCount, 0) || 0;
  const totalSize = projects?.reduce((sum, p) => sum + p.totalSize, 0) || 0;

  const isLoadingData = isLoading && !projects;

  return (
    <div className="space-y-6">
      {isLoadingData && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
          <ProjectCardSkeleton />
        </div>
      )}
      <div>
        <h2 className="text-2xl font-bold text-gray-100">Projects</h2>
        <p className="mt-1 text-sm text-gray-500">
          Các dự án đã từng chạy Claude Code — mỗi project lưu transcript riêng
        </p>
      </div>

      {/* Giải thích */}
      <div className="rounded-xl border border-blue-800/30 bg-blue-900/10 p-4 space-y-2">
        <p className="text-xs text-gray-400 leading-relaxed">
          <strong className="text-gray-300">📁 Projects</strong> là danh sách các <strong className="text-gray-300">thư mục dự án</strong> trên máy bạn đã từng chạy Claude Code.
          Mỗi khi Claude Code hoạt động trong một thư mục, nó tự động tạo một thư mục project trong{' '}
          <code className="text-accent">~/.claude/projects/</code> để lưu <strong className="text-gray-300">toàn bộ lịch sử hội thoại</strong> (transcript).
        </p>
        <div className="flex flex-wrap gap-2 text-[10px] text-gray-500">
          <span className="flex items-center gap-1">📄 Mỗi file <code className="text-accent">.jsonl</code> = 1 session chat</span>
          <span className="flex items-center gap-1">🗂️ Mỗi thư mục tương ứng với 1 dự án trên máy</span>
          <span className="flex items-center gap-1">🔗 Click <strong className="text-gray-400">"Xem N sessions"</strong> để xem chi tiết</span>
          <span className="flex items-center gap-1">🗑️ <strong className="text-gray-400">Purge data</strong> để xoá transcript cũ, giải phóng dung lượng</span>
        </div>
      </div>

      {/* Thống kê */}
      {projects && projects.length > 0 && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-xl border border-claude-800 bg-claude-900 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-claude-800 p-2">
                <FolderOpen className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-100">{projects.length}</p>
                <p className="text-xs text-gray-500">Projects</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-claude-800 bg-claude-900 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-claude-800 p-2">
                <FileText className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-100">{totalSessions}</p>
                <p className="text-xs text-gray-500">Total sessions</p>
              </div>
            </div>
          </div>
          <div className="rounded-xl border border-claude-800 bg-claude-900 p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-claude-800 p-2">
                <Database className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="text-2xl font-bold text-gray-100">{formatBytes(totalSize)}</p>
                <p className="text-xs text-gray-500">Total size</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Danh sách projects */}
      {!projects || projects.length === 0 ? (
        <EmptyState
          icon={FolderOpen}
          title="Chưa có project nào"
          description="Projects sẽ xuất hiện sau khi anh chạy Claude Code trong 1 thư mục"
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((project) => (
            <div
              key={project.slug}
              className="rounded-xl border border-claude-800 bg-claude-900 p-4 transition-colors hover:border-claude-700"
            >
              <div className="flex items-start gap-3">
                <div className="rounded-lg bg-claude-800 p-2 mt-0.5">
                  <FolderOpen className="h-4 w-4 text-accent" />
                </div>
                <div className="flex-1 min-w-0">
                  {/* Hiển thị đường dẫn */}
                  <p className="text-sm text-gray-200 font-mono truncate" title={project.originalPath}>
                    📁 {project.originalPath}
                  </p>
                  <p className="mt-0.5 text-[10px] text-gray-600">
                    ~/.claude/projects/{project.slug}/
                  </p>
                  <button
                    onClick={() => navigate(`/sessions?project=${project.slug}`)}
                    className="mt-1.5 text-xs text-accent hover:text-accent-light transition-colors text-left inline-flex items-center gap-1"
                  >
                    <FileText className="h-3 w-3" />
                    Xem {project.sessionCount} sessions →
                  </button>
                </div>
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 text-center">
                <div>
                  <p className="text-sm font-semibold text-gray-200">{project.sessionCount}</p>
                  <p className="text-xs text-gray-600">sessions</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-200">{formatBytes(project.totalSize)}</p>
                  <p className="text-xs text-gray-600">dung lượng</p>
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-200">
                    {project.lastActivity ? formatRelativeTime(project.lastActivity) : '-'}
                  </p>
                  <p className="text-xs text-gray-600">gần nhất</p>
                </div>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setConfirmPurge(project.slug)}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-red-900/30 hover:text-red-400"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Purge data
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmPurge}
        title="Xoá dữ liệu Project"
        message={`Bạn có chắc muốn xoá toàn bộ dữ liệu Claude Code của "${confirmPurge}"? Transcript sessions sẽ bị xoá vĩnh viễn.`}
        confirmLabel="Xoá"
        variant="danger"
        onConfirm={() => {
          if (confirmPurge) {
            purgeMutation.mutate(confirmPurge);
            setConfirmPurge(null);
          }
        }}
        onCancel={() => setConfirmPurge(null)}
      />
    </div>
  );
}
