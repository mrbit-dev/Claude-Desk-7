import { useState, useEffect } from 'react';
import { Settings2, Plus, Trash2, Save, Palette, Brain, Cpu, Gauge, Shield, Key, Terminal, Monitor, Eye } from 'lucide-react';
import { useSettings, useUpdateSettings } from '../hooks/useSettings';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import toast from 'react-hot-toast';
import clsx from 'clsx';

type Tab = 'general' | 'advanced' | 'env' | 'json';

export default function Settings() {
  const { data: settings, isLoading } = useSettings();
  const updateSettings = useUpdateSettings();
  const [activeTab, setActiveTab] = useState<Tab>('general');

  // Editable state
  const [model, setModel] = useState('');
  const [effort, setEffort] = useState('');
  const [theme, setTheme] = useState('');
  const [logLevel, setLogLevel] = useState('');
  const [corsOrigins, setCorsOrigins] = useState('');
  const [verifyModel, setVerifyModel] = useState('');
  const [safeMode, setSafeMode] = useState(false);
  const [verbose, setVerbose] = useState(false);
  const [envVars, setEnvVars] = useState<Array<{ key: string; value: string }>>([]);
  const [jsonRaw, setJsonRaw] = useState('');
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (settings) {
      setModel(settings.model || '');
      setEffort(settings.effortLevel || '');
      setTheme(settings.theme || '');
      setLogLevel(settings.logLevel || '');
      setCorsOrigins(settings.allowedTools?.join(', ') || '');
      setVerifyModel(settings.verifyModel || '');
      setSafeMode(settings.safeMode ?? false);
      setVerbose(settings.verbose ?? false);
      setEnvVars(
        Object.entries(settings.env || {}).map(([key, value]) => ({ key, value }))
      );
      setJsonRaw(JSON.stringify(settings, null, 2));
    }
  }, [settings]);

  const handleSave = async () => {
    try {
      let updated: Record<string, unknown>;

      if (activeTab === 'json') {
        updated = JSON.parse(jsonRaw);
      } else if (activeTab === 'env') {
        const env: Record<string, string> = {};
        envVars.forEach(({ key, value }) => {
          if (key.trim()) env[key.trim()] = value;
        });
        updated = { env };
      } else if (activeTab === 'advanced') {
        updated = {
          ...(corsOrigins ? { allowedTools: corsOrigins.split(',').map(s => s.trim()).filter(Boolean) } : {}),
          ...(verifyModel ? { verifyModel: verifyModel } : {}),
          safeMode,
          verbose,
        };
        if (logLevel) updated.logLevel = logLevel;
      } else {
        updated = {};
        if (model) updated.model = model;
        if (effort) updated.effortLevel = effort;
        if (theme) updated.theme = theme;
      }

      await updateSettings.mutateAsync(updated as any);
      toast.success('Đã lưu settings');
      setDirty(false);
    } catch (error) {
      toast.error('Lưu thất bại. Kiểm tra lại JSON hợp lệ.');
    }
  };

  const addEnvVar = () => {
    setEnvVars([...envVars, { key: '', value: '' }]);
    setDirty(true);
  };

  const removeEnvVar = (index: number) => {
    setEnvVars(envVars.filter((_, i) => i !== index));
    setDirty(true);
  };

  const updateEnvVar = (index: number, field: 'key' | 'value', val: string) => {
    const updated = [...envVars];
    updated[index][field] = val;
    setEnvVars(updated);
    setDirty(true);
  };

  const isLoadingData = isLoading && !settings;

  const tabs: { key: Tab; icon: any; label: string }[] = [
    { key: 'general', icon: Brain, label: 'General' },
    { key: 'advanced', icon: Cpu, label: 'Advanced' },
    { key: 'env', icon: Key, label: 'Environment' },
    { key: 'json', icon: Terminal, label: 'Raw JSON' },
  ];

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {isLoadingData && (
        <div className="flex justify-center py-4">
          <LoadingSpinner />
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Settings</h2>
          <p className="mt-1 text-sm text-gray-500">
            Quản lý cấu hình Claude Code (<code className="text-accent">~/.claude/settings.json</code>)
          </p>
        </div>
        <button
          onClick={handleSave}
          disabled={!dirty}
          className={clsx(
            'flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-medium transition-colors',
            dirty
              ? 'bg-accent text-white hover:bg-accent-dark'
              : 'bg-claude-800 text-gray-500 cursor-not-allowed'
          )}
        >
          <Save className="h-4 w-4" />
          Lưu
        </button>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 rounded-lg bg-claude-900 p-1 border border-claude-800 overflow-x-auto">
        {tabs.map(({ key, icon: Icon, label }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={clsx(
              'flex items-center gap-2 rounded-md px-4 py-2 text-sm font-medium transition-colors whitespace-nowrap',
              activeTab === key
                ? 'bg-claude-800 text-gray-200'
                : 'text-gray-500 hover:text-gray-300'
            )}
          >
            <Icon className="h-4 w-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="rounded-xl border border-claude-800 bg-claude-900 p-6">
        {activeTab === 'general' && (
          <div className="space-y-5">
            {/* Model */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Brain className="h-4 w-4 text-accent" />
                Model
              </label>
              <p className="mt-0.5 text-[10px] text-gray-600 mb-2">Model Claude Code sẽ dùng để trả lời</p>
              <select
                value={model}
                onChange={(e) => { setModel(e.target.value); setDirty(true); }}
                className="mt-1 w-full rounded-lg border border-claude-700 bg-claude-950 px-3 py-2 text-sm text-gray-200 focus:border-accent focus:outline-none"
              >
                <option value="">Mặc định (settings.json)</option>
                <option value="claude-opus-4-8">Claude Opus 4.8 — Mạnh nhất, chậm hơn</option>
                <option value="claude-fable-5">Claude Fable 5 — Mới nhất, nhanh</option>
                <option value="claude-sonnet-5">Claude Sonnet 5 — Cân bằng</option>
                <option value="claude-haiku-4-5">Claude Haiku 4.5 — Nhanh, rẻ</option>
              </select>
            </div>

            {/* Effort */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Gauge className="h-4 w-4 text-accent" />
                Effort Level
              </label>
              <p className="mt-0.5 text-[10px] text-gray-600 mb-2">Mức độ "suy nghĩ" của Claude khi giải quyết vấn đề</p>
              <select
                value={effort}
                onChange={(e) => { setEffort(e.target.value); setDirty(true); }}
                className="mt-1 w-full rounded-lg border border-claude-700 bg-claude-950 px-3 py-2 text-sm text-gray-200 focus:border-accent focus:outline-none"
              >
                <option value="">Mặc định</option>
                <option value="low">Low — Nhanh, ít suy nghĩ</option>
                <option value="medium">Medium</option>
                <option value="high">High — Cân bằng tốt</option>
                <option value="xhigh">Extra High — Suy nghĩ nhiều hơn</option>
                <option value="max">Maximum — Tối đa, chậm nhất</option>
              </select>
            </div>

            {/* Theme */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Palette className="h-4 w-4 text-accent" />
                Theme
              </label>
              <p className="mt-0.5 text-[10px] text-gray-600 mb-2">Giao diện hiển thị trong terminal</p>
              <select
                value={theme}
                onChange={(e) => { setTheme(e.target.value); setDirty(true); }}
                className="mt-1 w-full rounded-lg border border-claude-700 bg-claude-950 px-3 py-2 text-sm text-gray-200 focus:border-accent focus:outline-none"
              >
                <option value="">Mặc định</option>
                <option value="dark-daltonized">Dark Daltonized — Tối, thân thiện</option>
                <option value="light">Light — Sáng</option>
                <option value="dark">Dark — Tối</option>
              </select>
            </div>
          </div>
        )}

        {activeTab === 'advanced' && (
          <div className="space-y-5">
            {/* Log Level */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Terminal className="h-4 w-4 text-accent" />
                Log Level
              </label>
              <p className="mt-0.5 text-[10px] text-gray-600 mb-2">Mức độ chi tiết của log Claude Code (dùng để debug)</p>
              <select
                value={logLevel}
                onChange={(e) => { setLogLevel(e.target.value); setDirty(true); }}
                className="mt-1 w-full rounded-lg border border-claude-700 bg-claude-950 px-3 py-2 text-sm text-gray-200 focus:border-accent focus:outline-none"
              >
                <option value="">Mặc định</option>
                <option value="debug">Debug — Chi tiết nhất</option>
                <option value="info">Info — Thông tin chung</option>
                <option value="warn">Warn — Cảnh báo</option>
                <option value="error">Error — Chỉ lỗi</option>
              </select>
            </div>

            {/* Verbose */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Monitor className="h-4 w-4 text-accent" />
                Chế độ hiển thị
              </label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={verbose}
                    onChange={(e) => { setVerbose(e.target.checked); setDirty(true); }}
                    className="rounded border-claude-700 bg-claude-950 text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-gray-400">Verbose mode — Hiển thị chi tiết hơn</span>
                </label>
              </div>
            </div>

            {/* Safe Mode */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Shield className="h-4 w-4 text-accent" />
                Safe Mode
              </label>
              <div className="mt-2 space-y-2">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={safeMode}
                    onChange={(e) => { setSafeMode(e.target.checked); setDirty(true); }}
                    className="rounded border-claude-700 bg-claude-950 text-accent focus:ring-accent"
                  />
                  <span className="text-sm text-gray-400">Bật Safe Mode — Tắt hết customizations (dùng để debug)</span>
                </label>
                <p className="text-[10px] text-gray-600 ml-6">Khi bật, Claude sẽ bỏ qua CLAUDE.md, skills, plugins, hooks, MCP servers. Chỉ dùng khi cần debug lỗi cấu hình.</p>
              </div>
            </div>

            {/* Verify Model */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Eye className="h-4 w-4 text-accent" />
                Verify Model
              </label>
              <p className="mt-0.5 text-[10px] text-gray-600 mb-2">Model dùng cho verify skill (mặc định dùng model hiện tại)</p>
              <select
                value={verifyModel}
                onChange={(e) => { setVerifyModel(e.target.value); setDirty(true); }}
                className="mt-1 w-full rounded-lg border border-claude-700 bg-claude-950 px-3 py-2 text-sm text-gray-200 focus:border-accent focus:outline-none"
              >
                <option value="">Mặc định (dùng model chính)</option>
                <option value="claude-opus-4-8">Claude Opus 4.8</option>
                <option value="claude-fable-5">Claude Fable 5</option>
                <option value="claude-sonnet-5">Claude Sonnet 5</option>
                <option value="claude-haiku-4-5">Claude Haiku 4.5</option>
              </select>
            </div>

            {/* Allowed Tools */}
            <div>
              <label className="flex items-center gap-2 text-sm font-medium text-gray-300">
                <Cpu className="h-4 w-4 text-accent" />
                Allowed Tools
              </label>
              <p className="mt-0.5 text-[10px] text-gray-600 mb-2">Giới hạn tools Claude được phép dùng (cách nhau bằng dấu phẩy). Để trống = cho phép tất cả.</p>
              <input
                type="text"
                placeholder="ví dụ: Bash, Read, Edit, Write, Grep"
                value={corsOrigins}
                onChange={(e) => { setCorsOrigins(e.target.value); setDirty(true); }}
                className="mt-1 w-full rounded-lg border border-claude-700 bg-claude-950 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-accent focus:outline-none"
              />
              <p className="mt-1 text-[10px] text-gray-700">Ví dụ: <code className="text-gray-500">Bash, Read, Edit</code> — chỉ cho Claude dùng 3 tool này</p>
            </div>
          </div>
        )}

        {activeTab === 'env' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Biến môi trường cho Claude Code</p>
                <p className="text-[10px] text-gray-600">Các biến như API key, base URL,... được truyền vào Claude khi chạy</p>
              </div>
              <button
                onClick={addEnvVar}
                className="flex items-center gap-1.5 rounded-lg text-sm text-accent hover:text-accent-light"
              >
                <Plus className="h-4 w-4" />
                Thêm
              </button>
            </div>

            <div className="space-y-2">
              {envVars.length === 0 && (
                <p className="py-4 text-center text-sm text-gray-600">Chưa có biến môi trường nào</p>
              )}
              {envVars.map((env, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      placeholder="Tên biến (ví dụ: OPENAI_API_KEY)"
                      value={env.key}
                      onChange={(e) => updateEnvVar(i, 'key', e.target.value)}
                      className="w-full rounded-lg border border-claude-700 bg-claude-950 px-3 py-2 text-sm font-mono text-gray-200 placeholder-gray-600 focus:border-accent focus:outline-none"
                    />
                  </div>
                  <div className="relative flex-[2]">
                    <input
                      type={env.key.toLowerCase().includes('key') || env.key.toLowerCase().includes('token') || env.key.toLowerCase().includes('secret') ? 'password' : 'text'}
                      placeholder="Giá trị"
                      value={env.value}
                      onChange={(e) => updateEnvVar(i, 'value', e.target.value)}
                      className="w-full rounded-lg border border-claude-700 bg-claude-950 px-3 py-2 text-sm font-mono text-gray-200 placeholder-gray-600 focus:border-accent focus:outline-none"
                    />
                  </div>
                  <button
                    onClick={() => removeEnvVar(i)}
                    className="rounded-lg p-2 text-gray-500 hover:text-red-400 transition-colors"
                    title="Xoá biến"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
              {envVars.length > 0 && (
                <p className="text-[10px] text-gray-700">🔒 Các biến chứa "key", "token", "secret" sẽ được ẩn tự động</p>
              )}
            </div>

            {/* Quick add common env vars */}
            <div className="rounded-lg border border-claude-700 bg-claude-950 p-3">
              <p className="text-xs text-gray-400 mb-2">Thêm nhanh biến thường dùng:</p>
              <div className="flex flex-wrap gap-2">
                {['ANTHROPIC_API_KEY', 'OPENAI_API_KEY', 'ANTHROPIC_BASE_URL', 'ANTHROPIC_MODEL', 'CLAUDE_CODE_LOG_LEVEL', 'BRAVE_API_KEY'].map((key) => {
                  const alreadyHas = envVars.some(e => e.key === key);
                  return (
                    <button
                      key={key}
                      disabled={alreadyHas}
                      onClick={() => {
                        setEnvVars([...envVars, { key, value: '' }]);
                        setDirty(true);
                      }}
                      className="rounded border border-claude-700 px-2 py-1 text-[10px] text-gray-500 hover:bg-claude-800 hover:text-gray-300 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    >
                      {alreadyHas ? `✓ ${key}` : `+ ${key}`}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {activeTab === 'json' && (
          <div>
            <p className="mb-3 text-sm text-gray-500">
              Chỉnh sửa trực tiếp file settings.json. Cẩn thận với cú pháp JSON.
            </p>
            <textarea
              value={jsonRaw}
              onChange={(e) => { setJsonRaw(e.target.value); setDirty(true); }}
              className="w-full h-[500px] rounded-lg border border-claude-700 bg-claude-950 p-4 font-mono text-sm text-gray-300 focus:border-accent focus:outline-none"
              spellCheck={false}
            />
          </div>
        )}
      </div>

      {/* File info & tips */}
      <div className="space-y-2">
        <div className="rounded-xl border border-claude-800 bg-claude-900 p-4">
          <div className="flex items-center gap-2 text-xs text-gray-500">
            <Settings2 className="h-3.5 w-3.5" />
            <span>File cấu hình: <code className="text-accent">~/.claude/settings.json</code></span>
          </div>
        </div>
        <div className="rounded-xl border border-claude-800 bg-claude-900 p-4">
          <p className="text-xs text-gray-500">
            💡 <strong className="text-gray-400">Mẹo:</strong> Các thay đổi ở tab General, Advanced và Environment sẽ được ghi vào file settings.json.
            Nếu cần chỉnh sửa nâng cao, dùng tab <strong className="text-gray-400">Raw JSON</strong>.
            Backup tự động được tạo trong <code className="text-accent">~/.claude/backups/</code> trước mỗi lần lưu.
          </p>
        </div>
      </div>
    </div>
  );
}
