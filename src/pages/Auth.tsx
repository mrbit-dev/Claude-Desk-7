import { useQuery, useMutation } from '@tanstack/react-query';
import { UserCircle, LogIn, LogOut, ExternalLink, CheckCircle2, AlertCircle, Key, Shield, Server, Globe, Terminal } from 'lucide-react';
import { api } from '../api/client';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { useSettings } from '../hooks/useSettings';
import toast from 'react-hot-toast';

interface AuthStatus {
  loggedIn: boolean;
  authMethod?: string;
  apiProvider?: string;
}

export default function Auth() {
  const { data: auth, isLoading } = useQuery<AuthStatus>({
    queryKey: ['auth'],
    queryFn: () => api.get('/auth/status'),
    refetchInterval: 30000,
  });

  const { data: settings } = useSettings();

  const apiBaseUrl = settings?.env?.ANTHROPIC_BASE_URL || 'Mặc định (api.anthropic.com)';
  const apiModel = settings?.env?.ANTHROPIC_MODEL || settings?.model || 'Mặc định';
  const proxyUrl = apiBaseUrl !== 'Mặc định (api.anthropic.com)' ? apiBaseUrl : null;

  if (isLoading && !auth) {
    return <div className="flex h-full items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-100">Authentication</h2>
        <p className="mt-1 text-sm text-gray-500">Trạng thái xác thực và kết nối Claude Code</p>
      </div>

      {/* Status card */}
      <div className="rounded-xl border border-claude-800 bg-claude-900 p-6">
        <div className="flex items-center gap-4">
          <div className={`rounded-full p-3 ${auth?.loggedIn ? 'bg-green-500/10' : 'bg-yellow-500/10'}`}>
            {auth?.loggedIn
              ? <CheckCircle2 className="h-8 w-8 text-green-400" />
              : <AlertCircle className="h-8 w-8 text-yellow-400" />
            }
          </div>
          <div className="flex-1">
            <p className="text-lg font-semibold text-gray-100">
              {auth?.loggedIn ? 'Đã đăng nhập' : 'Chưa đăng nhập'}
            </p>
            <p className="text-sm text-gray-500">
              {auth?.authMethod || 'Chưa có phương thức xác thực'}
              {auth?.apiProvider ? ` · ${auth.apiProvider}` : ''}
            </p>
          </div>
          {auth?.loggedIn ? (
            <div className="rounded-lg border border-claude-700 px-3 py-1.5 text-xs text-gray-500">
              <code className="text-gray-400">claude auth status</code>
            </div>
          ) : null}
        </div>
      </div>

      {/* Connection Info */}
      <div className="rounded-xl border border-claude-800 bg-claude-900 p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-4">
          <Globe className="h-4 w-4 text-accent" />
          Kết nối API
        </h3>
        <div className="space-y-4">
          <div className="flex items-start justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Server className="h-4 w-4" />
              <span>API Base URL</span>
            </div>
            <div className="text-right">
              <p className="text-gray-200 font-mono text-xs break-all max-w-xs">
                {apiBaseUrl}
              </p>
              {proxyUrl && (
                <p className="text-[10px] text-yellow-500 mt-1">⚠️ Đang dùng proxy — request không gửi trực tiếp đến Anthropic</p>
              )}
            </div>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Key className="h-4 w-4" />
              <span>API Key</span>
            </div>
            <span className="text-gray-400 font-mono text-xs">
              {settings?.env?.ANTHROPIC_AUTH_TOKEN
                ? `${settings.env.ANTHROPIC_AUTH_TOKEN.slice(0, 8)}...${settings.env.ANTHROPIC_AUTH_TOKEN.slice(-4)}`
                : 'Dùng OAuth (đăng nhập)'
              }
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2 text-gray-500">
              <Terminal className="h-4 w-4" />
              <span>Model</span>
            </div>
            <span className="text-gray-300 font-mono text-xs">{apiModel}</span>
          </div>
        </div>
      </div>

      {/* Account details */}
      <div className="rounded-xl border border-claude-800 bg-claude-900 p-6">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-gray-300 mb-4">
          <Shield className="h-4 w-4 text-accent" />
          Chi tiết tài khoản
        </h3>
        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Trạng thái</span>
            <span className={auth?.loggedIn ? 'text-green-400' : 'text-yellow-400'}>
              {auth?.loggedIn ? 'Authenticated' : 'Unauthenticated'}
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Phương thức</span>
            <span className="text-gray-300">{auth?.authMethod || 'N/A'}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">API Provider</span>
            <span className="text-gray-300">{auth?.apiProvider || 'N/A'}</span>
          </div>
        </div>
      </div>

      {/* Guide */}
      <div className="rounded-xl border border-blue-800/30 bg-blue-900/10 p-4">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-blue-400 mb-3">
          <LogIn className="h-4 w-4" />
          Hướng dẫn xác thực
        </h3>
        <div className="space-y-2 text-xs text-gray-400 leading-relaxed">
          <p>🔹 <strong className="text-gray-300">Đăng nhập (OAuth):</strong></p>
          <p className="ml-4">
            Dùng lệnh trong terminal:<br />
            <code className="text-accent">claude auth login</code>
          </p>
          <p className="ml-4 mt-1">
            Trình duyệt sẽ mở ra để đăng nhập tài khoản Anthropic.
          </p>

          <p className="mt-3">🔹 <strong className="text-gray-300">API Key (proxy):</strong></p>
          <p className="ml-4">
            Vào <strong>Settings</strong> → tab <strong>Environment</strong>, thêm:<br />
            <code className="text-accent">ANTHROPIC_AUTH_TOKEN</code> = key của anh<br />
            <code className="text-accent">ANTHROPIC_BASE_URL</code> = endpoint proxy<br />
            <code className="text-accent">ANTHROPIC_MODEL</code> = tên model
          </p>

          <p className="mt-3">🔹 <strong className="text-gray-300">Kiểm tra:</strong></p>
          <p className="ml-4">
            <code className="text-accent">claude auth status</code>
          </p>
        </div>
      </div>

      {/* Quick actions */}
      <div className="rounded-xl border border-claude-800 bg-claude-900 p-4">
        <h3 className="text-sm font-semibold text-gray-300 mb-3">Thao tác nhanh</h3>
        <div className="space-y-2">
          <button
            onClick={() => {
              toast.success('Mở terminal và chạy: claude auth login');
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-400 transition-colors hover:bg-claude-800 hover:text-gray-200"
          >
            <LogIn className="h-4 w-4" />
            <span>Mở trình duyệt đăng nhập Claude</span>
            <span className="ml-auto text-[10px] text-gray-600">Chưa hỗ trợ từ dashboard</span>
          </button>
          <button
            onClick={() => {
              window.open('https://console.anthropic.com/settings/keys', '_blank');
            }}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-400 transition-colors hover:bg-claude-800 hover:text-gray-200"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Lấy API key trên Anthropic Console</span>
            <ExternalLink className="ml-auto h-3 w-3 text-gray-600" />
          </button>
        </div>
      </div>
    </div>
  );
}
