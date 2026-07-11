import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Puzzle, Globe, Download, Trash2, BookOpen, Loader2 } from 'lucide-react';
import { api } from '../api/client';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { EmptyState } from '../components/shared/EmptyState';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import toast from 'react-hot-toast';
import { useState } from 'react';

interface PluginInfo {
  name: string;
  source: string;
  installed: boolean;
  description?: string;
  installLocation?: string;
}

export default function Plugins() {
  const queryClient = useQueryClient();
  const [showGuide, setShowGuide] = useState(false);
  const [confirmUninstall, setConfirmUninstall] = useState<string | null>(null);

  const { data: installed, isLoading: loadingInstalled } = useQuery<PluginInfo[]>({
    queryKey: ['plugins'],
    queryFn: () => api.get('/plugins'),
  });

  const { data: marketplace, isLoading: loadingMarketplace } = useQuery<PluginInfo[]>({
    queryKey: ['plugins', 'marketplace'],
    queryFn: () => api.get('/plugins/marketplace'),
  });

  const installPlugin = useMutation({
    mutationFn: (name: string) => api.post(`/plugins/${encodeURIComponent(name)}/install`),
    onSuccess: (_data, name) => {
      toast.success(`Đã cài plugin: ${name}`);
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
    onError: () => toast.error('Cài plugin thất bại'),
  });

  const uninstallPlugin = useMutation({
    mutationFn: (name: string) => api.post(`/plugins/${encodeURIComponent(name)}/uninstall`),
    onSuccess: (_data, name) => {
      toast.success(`Đã gỡ plugin: ${name}`);
      setConfirmUninstall(null);
      queryClient.invalidateQueries({ queryKey: ['plugins'] });
    },
    onError: () => toast.error('Gỡ plugin thất bại'),
  });

  if (loadingInstalled || loadingMarketplace) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Plugins</h2>
          <p className="mt-1 text-sm text-gray-500">Mở rộng khả năng Claude Code với các tích hợp sẵn</p>
        </div>
        <button
          onClick={() => setShowGuide(!showGuide)}
          className="flex items-center gap-2 rounded-lg border border-claude-700 px-3 py-1.5 text-xs text-gray-500 hover:bg-claude-800 hover:text-gray-300 transition-colors"
        >
          <BookOpen className="h-3.5 w-3.5" />
          Hướng dẫn
        </button>
      </div>

      {showGuide && (
        <div className="rounded-xl border border-blue-800/30 bg-blue-900/10 p-4 space-y-4">
          <div>
            <p className="text-xs font-medium text-blue-400 mb-1">🧠 Plugin là gì?</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              Plugin là các <strong className="text-gray-300">gói tích hợp sẵn</strong> giúp Claude Code làm việc với
              dịch vụ bên ngoài như GitHub, Linear, Asana, Firebase, Discord.v.v. Cài từ marketplace hoặc từ nguồn bên ngoài.
            </p>
          </div>
          <div className="rounded-lg bg-claude-950 p-3 text-[10px] text-gray-500 leading-relaxed">
            Dùng terminal nếu cần cài từ nguồn khác:<br />
            <code className="text-accent">claude plugin install &lt;tên&gt;</code> — Cài plugin<br />
            <code className="text-accent">claude plugin install ./path/file.zip</code> — Cài từ file local<br />
            <code className="text-accent">claude plugin uninstall &lt;tên&gt;</code> — Gỡ plugin
          </div>
        </div>
      )}

      {/* Đã cài */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">
          Đã cài ({installed?.length || 0})
        </h3>
        {!installed || installed.length === 0 ? (
          <div className="rounded-xl border border-claude-800 bg-claude-900 p-6 text-center">
            <Puzzle className="mx-auto h-8 w-8 text-gray-600 mb-2" />
            <p className="text-sm text-gray-600">Chưa có plugin nào</p>
            <p className="text-xs text-gray-700 mt-1">Cài từ danh sách marketplace bên dưới</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {installed.map((plugin) => (
              <div key={plugin.name} className="rounded-xl border border-green-800/30 bg-green-900/10 p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <Puzzle className="h-4 w-4 text-green-500 flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-gray-200 truncate">{plugin.name}</p>
                      {plugin.installLocation && (
                        <p className="text-[10px] text-gray-600 truncate">{plugin.installLocation}</p>
                      )}
                    </div>
                  </div>
                  <button
                    onClick={() => setConfirmUninstall(plugin.name)}
                    className="rounded-lg p-1.5 text-gray-500 hover:text-red-400 hover:bg-red-900/20 transition-colors flex-shrink-0"
                    title="Gỡ cài đặt"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Marketplace */}
      <div>
        <h3 className="text-sm font-semibold text-gray-300 mb-3">
          Marketplace ({marketplace?.length || 0})
        </h3>
        {!marketplace || marketplace.length === 0 ? (
          <EmptyState icon={Globe} title="Không tìm thấy marketplace" description="Plugin marketplace index không tồn tại" />
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {marketplace.slice(0, 30).map((plugin) => {
              const isInstalled = installed?.some(p => p.name === plugin.name);
              return (
                <div key={plugin.name} className="rounded-xl border border-claude-800 bg-claude-900 p-4 transition-colors hover:border-claude-700">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-start gap-3 min-w-0">
                      <Puzzle className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-gray-200 truncate">{plugin.name}</p>
                        {plugin.description && (
                          <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{plugin.description}</p>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center gap-2">
                    {isInstalled ? (
                      <span className="rounded bg-green-900/20 px-2 py-0.5 text-[10px] text-green-500 font-medium">✓ Đã cài</span>
                    ) : (
                      <button
                        onClick={() => installPlugin.mutate(plugin.name)}
                        disabled={installPlugin.isPending}
                        className="flex items-center gap-1 rounded-lg border border-claude-700 px-2.5 py-1 text-[10px] text-gray-500 hover:bg-accent hover:text-white transition-colors disabled:opacity-50"
                      >
                        {installPlugin.isPending && installPlugin.variables === plugin.name ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Download className="h-3 w-3" />
                        )}
                        Cài
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmUninstall}
        title="Gỡ Plugin"
        message={`Bạn có chắc muốn gỡ plugin "${confirmUninstall}"?`}
        confirmLabel="Gỡ"
        variant="danger"
        onConfirm={() => {
          if (confirmUninstall) uninstallPlugin.mutate(confirmUninstall);
        }}
        onCancel={() => setConfirmUninstall(null)}
      />
    </div>
  );
}
