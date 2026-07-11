import { useState } from 'react';
import { Server, Plus, Activity, Edit3, Trash2, X, Check } from 'lucide-react';
import { useMCPs, useAddMCPServer, useUpdateMCPServer, useDeleteMCPServer, useHealthCheck } from '../hooks/useMCPs';
import { MCPServerCardSkeleton } from '../components/shared/Skeleton';
import { EmptyState } from '../components/shared/EmptyState';
import { ConfirmDialog } from '../components/shared/ConfirmDialog';
import { MCPServerWithName } from '../types/claude';
import toast from 'react-hot-toast';
import clsx from 'clsx';

export default function MCPs() {
  const { data: servers, isLoading } = useMCPs();
  const addServer = useAddMCPServer();
  const updateServer = useUpdateMCPServer();
  const deleteServer = useDeleteMCPServer();
  const healthCheck = useHealthCheck();

  const [showAddForm, setShowAddForm] = useState(false);
  const [editingName, setEditingName] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [newServer, setNewServer] = useState({ name: '', command: '', args: '' });

  const handleAdd = async () => {
    if (!newServer.name || !newServer.command) {
      toast.error('Name and command are required');
      return;
    }
    try {
      await addServer.mutateAsync({
        name: newServer.name,
        command: newServer.command,
        args: newServer.args ? newServer.args.split(' ').filter(Boolean) : [],
        status: 'unknown',
      });
      setShowAddForm(false);
      setNewServer({ name: '', command: '', args: '' });
      toast.success(`MCP server "${newServer.name}" added`);
    } catch {
      toast.error('Failed to add MCP server');
    }
  };

  const handleHealthCheck = async (name: string) => {
    try {
      const result = await healthCheck.mutateAsync(name);
      if (result.alive) {
        toast.success(`"${name}" is healthy`);
      } else {
        toast.error(`"${name}" health check failed: ${result.error || 'Unknown error'}`);
      }
    } catch {
      toast.error('Health check failed');
    }
  };

  const isLoadingData = isLoading && !servers;

  return (
    <div className="space-y-6">
      {isLoadingData && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <MCPServerCardSkeleton />
          <MCPServerCardSkeleton />
          <MCPServerCardSkeleton />
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">MCP Servers</h2>
          <p className="mt-1 text-sm text-gray-500">
            Manage Model Context Protocol servers
          </p>
        </div>
        <button
          onClick={() => setShowAddForm(!showAddForm)}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-dark"
        >
          <Plus className="h-4 w-4" />
          Add Server
        </button>
      </div>

      {/* Add form */}
      {showAddForm && (
        <div className="rounded-xl border border-claude-700 bg-claude-800/50 p-4">
          {/* Giải thích khái niệm MCP Server */}
          <div className="mb-4 rounded-lg border border-blue-800/30 bg-blue-900/10 p-3">
            <p className="text-xs font-medium text-blue-400 mb-1">🧠 MCP Server là gì?</p>
            <p className="text-xs text-gray-400 leading-relaxed">
              MCP (Model Context Protocol) là giao thức giúp Claude Code kết nối với các công cụ bên ngoài.
              Mỗi MCP server là một <strong className="text-gray-300">chương trình riêng</strong> chạy trên máy của anh,
              cung cấp các <strong className="text-gray-300">công cụ (tools)</strong> cho Claude Code sử dụng khi cần.
            </p>
          </div>

          <p className="mb-3 text-xs text-gray-500">
            Cấu hình MCP server được lưu trong file <code className="text-accent">~/.claude/settings.json</code> của anh.
          </p>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Tên Server (Name)</label>
              <input
                type="text"
                placeholder="ví dụ: brave-search, my-tools, ..."
                value={newServer.name}
                onChange={(e) => setNewServer({ ...newServer, name: e.target.value })}
                className="w-full rounded-lg border border-claude-700 bg-claude-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-accent focus:outline-none"
              />
              <p className="mt-1 text-[10px] text-gray-600">Tên để nhận diện server này, đặt theo ý anh</p>
            </div>

            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Lệnh chạy (Command)</label>
              <input
                type="text"
                placeholder="ví dụ: npx, node path/to/file.js, ..."
                value={newServer.command}
                onChange={(e) => setNewServer({ ...newServer, command: e.target.value })}
                className="w-full rounded-lg border border-claude-700 bg-claude-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-accent focus:outline-none"
              />
              <p className="mt-1 text-[10px] text-gray-600">
                Đây là <strong className="text-gray-500">chương trình MCP server</strong> mà anh muốn chạy.
                Có thể là:<br />
                — <code className="text-gray-500">npx</code>: nếu server là gói Node.js (phổ biến nhất)<br />
                — <code className="text-gray-500">node index.js</code>: nếu anh tự viết server bằng JavaScript<br />
                — <code className="text-gray-500">python server.py</code>: nếu server viết bằng Python<br />
                — <code className="text-gray-500">uvx package-name</code>: nếu server là gói Python<br />
                — <code className="text-gray-500">docker run ...</code>: nếu server chạy trong container
              </p>
            </div>

            <div className="flex gap-2">
              <div className="flex-1">
                <label className="mb-1.5 block text-xs font-medium text-gray-400">Tham số (Arguments)</label>
                <input
                  type="text"
                  placeholder="các tham số, cách nhau bằng dấu cách"
                  value={newServer.args}
                  onChange={(e) => setNewServer({ ...newServer, args: e.target.value })}
                  className="w-full rounded-lg border border-claude-700 bg-claude-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-accent focus:outline-none"
                />
                <p className="mt-1 text-[10px] text-gray-600">
                  Là các tham số đi kèm với lệnh Command,<br />
                  <strong className="text-gray-500">cách nhau bằng dấu cách</strong>.<br />
                  Ví dụ: nếu command là <code className="text-gray-500">npx</code> và muốn chạy gói
                  <code className="text-gray-500">@modelcontextprotocol/server-brave-search</code>
                  thì args sẽ là: <code className="text-accent">-y @modelcontextprotocol/server-brave-search</code>
                </p>
              </div>

              <div className="flex items-end gap-2">
                <button
                  onClick={handleAdd}
                  className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
                  title="Add server"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="rounded-lg border border-claude-700 px-4 py-2 text-sm text-gray-500 hover:bg-claude-800"
                  title="Cancel"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Ví dụ thực tế */}
          <div className="mt-4 space-y-2">
            <p className="text-xs font-medium text-gray-400">📌 Ví dụ thực tế:</p>

            <div className="rounded-lg border border-claude-700 bg-claude-950 p-3">
              <p className="text-[11px] text-gray-300 font-medium mb-1">🔍 Brave Search — cho phép Claude tìm kiếm web</p>
              <div className="flex gap-6 text-[10px] text-gray-500">
                <span>Name: <code className="text-accent">brave-search</code></span>
                <span>Command: <code className="text-accent">npx</code></span>
                <span>Args: <code className="text-accent">-y @modelcontextprotocol/server-brave-search</code></span>
              </div>
              <p className="mt-1 text-[10px] text-gray-600">→ <code className="text-gray-500">npx</code> sẽ tải gói Node.js <code className="text-gray-500">@modelcontextprotocol/server-brave-search</code> về và chạy nó</p>
            </div>

            <div className="rounded-lg border border-claude-700 bg-claude-950 p-3">
              <p className="text-[11px] text-gray-300 font-medium mb-1">🖥️ Custom Server — MCP server tự viết</p>
              <div className="flex gap-6 text-[10px] text-gray-500">
                <span>Name: <code className="text-accent">my-tools</code></span>
                <span>Command: <code className="text-accent">node</code></span>
                <span>Args: <code className="text-accent">path/to/server.js</code></span>
              </div>
              <p className="mt-1 text-[10px] text-gray-600">→ <code className="text-gray-500">node</code> sẽ chạy file JavaScript <code className="text-gray-500">server.js</code> của bạn</p>
            </div>
          </div>
        </div>
      )}

      {/* Server cards */}
      {!servers || servers.length === 0 ? (
        <EmptyState
          icon={Server}
          title="No MCP servers configured"
          description="Add your first MCP server to get started"
          action={
            <button
              onClick={() => setShowAddForm(true)}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
            >
              Add Server
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {servers.map((server: MCPServerWithName) => (
            <ServerCard
              key={server.name}
              server={server}
              isEditing={editingName === server.name}
              onEdit={() => setEditingName(server.name)}
              onSave={(updates) => {
                updateServer.mutate({ name: server.name, updates });
                setEditingName(null);
              }}
              onCancel={() => setEditingName(null)}
              onDelete={() => setConfirmDelete(server.name)}
              onHealthCheck={() => handleHealthCheck(server.name)}
              isChecking={healthCheck.isPending && healthCheck.variables === server.name}
            />
          ))}
        </div>
      )}

      <ConfirmDialog
        open={!!confirmDelete}
        title="Delete MCP Server"
        message={`Are you sure you want to delete "${confirmDelete}"? This will remove it from settings.json.`}
        confirmLabel="Delete"
        variant="danger"
        onConfirm={() => {
          if (confirmDelete) {
            deleteServer.mutate(confirmDelete);
            setConfirmDelete(null);
          }
        }}
        onCancel={() => setConfirmDelete(null)}
      />
    </div>
  );
}

interface ServerCardProps {
  server: MCPServerWithName;
  isEditing: boolean;
  onEdit: () => void;
  onSave: (updates: Partial<MCPServerWithName>) => void;
  onCancel: () => void;
  onDelete: () => void;
  onHealthCheck: () => void;
  isChecking: boolean;
}

function ServerCard({
  server,
  isEditing,
  onEdit,
  onSave,
  onCancel,
  onDelete,
  onHealthCheck,
  isChecking,
}: ServerCardProps) {
  const [editCommand, setEditCommand] = useState(server.command);
  const [editArgs, setEditArgs] = useState(server.args.join(' '));

  if (isEditing) {
    return (
      <div className="rounded-xl border border-claude-700 bg-claude-800/50 p-4">
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-200">{server.name}</p>
          <input
            type="text"
            value={editCommand}
            onChange={(e) => setEditCommand(e.target.value)}
            className="w-full rounded-lg border border-claude-700 bg-claude-900 px-3 py-2 text-sm text-gray-200 focus:border-accent focus:outline-none"
            placeholder="Command"
          />
          <input
            type="text"
            value={editArgs}
            onChange={(e) => setEditArgs(e.target.value)}
            className="w-full rounded-lg border border-claude-700 bg-claude-900 px-3 py-2 text-sm text-gray-200 focus:border-accent focus:outline-none"
            placeholder="Args"
          />
          <div className="flex justify-end gap-2">
            <button onClick={onCancel} className="rounded-lg px-3 py-1.5 text-xs text-gray-500 hover:text-gray-300">
              Cancel
            </button>
            <button
              onClick={() => onSave({
                command: editCommand,
                args: editArgs.split(' ').filter(Boolean),
              })}
              className="rounded-lg bg-accent px-3 py-1.5 text-xs text-white hover:bg-accent-dark"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="card-hover rounded-xl border border-claude-800 bg-claude-900 p-4">
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="rounded-lg bg-claude-800 p-2">
            <Server className="h-4 w-4 text-accent" />
          </div>
          <div>
            <p className="text-sm font-medium text-gray-200">{server.name}</p>
            <p className="mt-0.5 text-xs text-gray-500">
              {server.command} {server.args?.join(' ') || ''}
            </p>
          </div>
        </div>
        <div
          className={clsx(
            'h-2.5 w-2.5 rounded-full',
            server.status === 'alive' && 'bg-green-500',
            server.status === 'error' && 'bg-red-500',
            (!server.status || server.status === 'unknown') && 'bg-gray-500'
          )}
        />
      </div>

      <div className="mt-4 flex items-center gap-2">
        <button
          onClick={onHealthCheck}
          disabled={isChecking}
          className="flex items-center gap-1.5 rounded-lg border border-claude-700 px-3 py-1.5 text-xs text-gray-500 transition-colors hover:bg-claude-800 hover:text-gray-300 disabled:opacity-50"
        >
          <Activity className="h-3.5 w-3.5" />
          {isChecking ? 'Checking...' : 'Health check'}
        </button>
        <button
          onClick={onEdit}
          className="rounded-lg border border-claude-700 p-1.5 text-gray-500 transition-colors hover:bg-claude-800 hover:text-gray-300"
        >
          <Edit3 className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={onDelete}
          className="rounded-lg border border-claude-700 p-1.5 text-gray-500 transition-colors hover:bg-red-900/30 hover:text-red-400"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
}
