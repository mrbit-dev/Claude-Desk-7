import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { BookOpen, FileText, Plus, Loader2, X, Check, FolderOpen, FileEdit } from 'lucide-react';
import { api } from '../api/client';
import { SkillInfo } from '../types/claude';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';
import { EmptyState } from '../components/shared/EmptyState';
import toast from 'react-hot-toast';
import { useState } from 'react';

function SkillCard({ skill }: { skill: SkillInfo }) {
  const [expanded, setExpanded] = useState(false);
  const [content, setContent] = useState('');
  const [dirty, setDirty] = useState(false);
  const queryClient = useQueryClient();

  const { data: contentData, isFetching: loadingContent } = useQuery<{ name: string; content: string }>({
    queryKey: ['skill-content', skill.name],
    queryFn: () => api.get(`/skills/${skill.name}/content`),
    enabled: expanded,
    staleTime: 60000,
  });

  const updateMutation = useMutation({
    mutationFn: (newContent: string) =>
      api.put(`/skills/${skill.name}/content`, { content: newContent }),
    onSuccess: () => {
      toast.success(`SKILL.md của /${skill.name} đã lưu`);
      setDirty(false);
      queryClient.invalidateQueries({ queryKey: ['skill-content', skill.name] });
    },
    onError: (err: any) => toast.error(err?.message || 'Lưu thất bại'),
  });

  const handleExpand = () => {
    if (!expanded) {
      setExpanded(true);
    }
  };

  const handleSave = () => {
    updateMutation.mutate(content);
  };

  const handleCancel = () => {
    setContent(contentData?.content || '');
    setDirty(false);
    setExpanded(false);
  };

  // Sync content when data arrives
  if (contentData && !dirty && content !== contentData.content) {
    setContent(contentData.content);
  }

  return (
    <div className="rounded-xl border border-claude-800 bg-claude-900 transition-colors hover:border-claude-700">
      <div
        className="p-4 cursor-pointer"
        onClick={handleExpand}
      >
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-claude-800 p-2">
            <BookOpen className="h-4 w-4 text-accent" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-gray-200">/{skill.name}</p>
            <p className="mt-0.5 text-xs text-gray-500 line-clamp-2">{skill.description}</p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-gray-600">
          {skill.hasSkillMd && (
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" /> SKILL.md
            </span>
          )}
          {skill.hasClaudeMd && (
            <span className="flex items-center gap-1">
              <FileText className="h-3 w-3" /> CLAUDE.md
            </span>
          )}
          <button
            onClick={(e) => {
              e.stopPropagation();
              api.post('/files/open', { path: skill.path })
                .then(() => toast.success('Đã mở thư mục skill'))
                .catch(() => toast.error('Không thể mở thư mục'));
            }}
            className="flex items-center gap-1 text-gray-500 hover:text-accent transition-colors"
            title="Mở thư mục skill"
          >
            <FolderOpen className="h-3 w-3" />
            Open folder
          </button>
        </div>
      </div>

      {/* Expanded editor */}
      {expanded && (
        <div className="border-t border-claude-800 p-4 space-y-3" onClick={(e) => e.stopPropagation()}>
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-medium text-gray-400 flex items-center gap-1.5">
              <FileEdit className="h-3.5 w-3.5" />
              SKILL.md
            </h4>
            {loadingContent && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-500" />}
          </div>

          {loadingContent ? (
            <div className="flex items-center justify-center py-8">
              <LoadingSpinner />
            </div>
          ) : (
            <>
              <textarea
                value={content}
                onChange={(e) => {
                  setContent(e.target.value);
                  setDirty(true);
                }}
                className="w-full h-64 rounded-lg border border-claude-700 bg-claude-950 px-3 py-2 text-xs text-gray-300 font-mono placeholder-gray-600 focus:border-accent focus:outline-none resize-y"
                spellCheck={false}
              />
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-gray-600">
                  {content.length} ký tự
                </span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCancel}
                    className="flex items-center gap-1 rounded-lg border border-claude-700 px-3 py-1.5 text-xs text-gray-500 hover:bg-claude-800 transition-colors"
                  >
                    <X className="h-3 w-3" />
                    Cancel
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!dirty || updateMutation.isPending}
                    className="flex items-center gap-1 rounded-lg bg-accent px-3 py-1.5 text-xs font-medium text-white hover:bg-accent-dark disabled:opacity-50 transition-colors"
                  >
                    {updateMutation.isPending ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Check className="h-3 w-3" />
                    )}
                    Save
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default function Skills() {
  const queryClient = useQueryClient();
  const { data: skills, isLoading } = useQuery<SkillInfo[]>({
    queryKey: ['skills'],
    queryFn: () => api.get('/skills'),
  });

  const [showForm, setShowForm] = useState(false);
  const [newSkill, setNewSkill] = useState({ name: '', description: '', triggers: '' });

  const createSkill = useMutation({
    mutationFn: (data: typeof newSkill) =>
      api.post('/skills', {
        name: data.name,
        description: data.description,
        triggers: data.triggers.split(',').map(t => t.trim()).filter(Boolean),
      }),
    onSuccess: (_, vars) => {
      toast.success(`Đã tạo skill /${vars.name}`);
      setShowForm(false);
      setNewSkill({ name: '', description: '', triggers: '' });
      queryClient.invalidateQueries({ queryKey: ['skills'] });
    },
    onError: (err: any) => {
      toast.error(err?.message || 'Tạo skill thất bại');
    },
  });

  const isLoadingData = isLoading && !skills;

  return (
    <div className="space-y-6">
      {isLoadingData && (
        <div className="flex justify-center py-4">
          <LoadingSpinner />
        </div>
      )}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-100">Skills</h2>
          <p className="mt-1 text-sm text-gray-500">Lệnh slash <code className="text-accent">/tên-skill</code> cho Claude Code</p>
        </div>
        <button
          onClick={() => setShowForm(!showForm)}
          className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark transition-colors"
        >
          <Plus className="h-4 w-4" />
          Tạo Skill
        </button>
      </div>

      {/* Giới thiệu */}
      <div className="rounded-xl border border-blue-800/30 bg-blue-900/10 p-3">
        <p className="text-xs text-gray-400 leading-relaxed">
          🧠 Skill là lệnh slash <code className="text-accent">/tên</code> trong Claude Code để thực hiện tác vụ cụ thể.
          Mỗi skill là thư mục trong <code className="text-accent">~/.claude/skills/</code> chứa file <code className="text-gray-500">SKILL.md</code>.
          Bấm <strong className="text-gray-300">Tạo Skill</strong> để tạo mới ngay từ dashboard. Bấm vào card để chỉnh sửa nội dung SKILL.md.
        </p>
      </div>

      {/* Form tạo skill */}
      {showForm && (
        <div className="rounded-xl border border-claude-700 bg-claude-800/50 p-4">
          <p className="mb-3 text-xs text-gray-400">Điền thông tin để tạo skill mới:</p>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Tên Skill</label>
              <input
                type="text"
                placeholder="ví dụ: my-helper, translate-doc"
                value={newSkill.name}
                onChange={(e) => setNewSkill({ ...newSkill, name: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '') })}
                className="w-full rounded-lg border border-claude-700 bg-claude-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-accent focus:outline-none"
              />
              <p className="mt-1 text-[10px] text-gray-600">Chỉ dùng chữ thường, số và dấu gạch ngang. Sau này gõ <code className="text-accent">/{'tên-skill'}</code> để dùng.</p>
            </div>
            <div>
              <label className="mb-1.5 block text-xs font-medium text-gray-400">Mô tả</label>
              <input
                type="text"
                placeholder="ví dụ: Hỗ trợ dịch tài liệu"
                value={newSkill.description}
                onChange={(e) => setNewSkill({ ...newSkill, description: e.target.value })}
                className="w-full rounded-lg border border-claude-700 bg-claude-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-accent focus:outline-none"
              />
              <p className="mt-1 text-[10px] text-gray-600">Mô tả ngắn skill này làm gì</p>
            </div>
          </div>
          <div className="mt-3">
            <label className="mb-1.5 block text-xs font-medium text-gray-400">Từ khoá kích hoạt (tuỳ chọn)</label>
            <input
              type="text"
              placeholder="ví dụ: dịch, translate, convert"
              value={newSkill.triggers}
              onChange={(e) => setNewSkill({ ...newSkill, triggers: e.target.value })}
              className="w-full rounded-lg border border-claude-700 bg-claude-900 px-3 py-2 text-sm text-gray-200 placeholder-gray-600 focus:border-accent focus:outline-none"
            />
            <p className="mt-1 text-[10px] text-gray-600">Cách nhau bằng dấu phẩy. Claude sẽ đề xuất dùng skill này khi thấy từ khoá.</p>
          </div>
          <div className="mt-4 flex items-center gap-2 justify-end">
            <button
              onClick={() => setShowForm(false)}
              className="rounded-lg border border-claude-700 px-3 py-1.5 text-xs text-gray-500 hover:bg-claude-800 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
            <button
              onClick={() => {
                if (!newSkill.name || !newSkill.description) {
                  toast.error('Cần nhập tên và mô tả');
                  return;
                }
                createSkill.mutate(newSkill);
              }}
              disabled={createSkill.isPending}
              className="flex items-center gap-1.5 rounded-lg bg-accent px-4 py-1.5 text-xs font-medium text-white hover:bg-accent-dark disabled:opacity-50 transition-colors"
            >
              {createSkill.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Tạo Skill
            </button>
          </div>
          <div className="mt-3 rounded-lg bg-claude-950 p-3">
            <p className="text-[10px] text-gray-600">
              💡 Sau khi tạo, skill sẽ xuất hiện trong Claude Code. Anh có thể gõ <code className="text-accent">/{'tên-skill'}</code> để sử dụng.
              File <code className="text-gray-500">SKILL.md</code> và <code className="text-gray-500">CLAUDE.md</code> đã được tạo trong <code className="text-accent">~/.claude/skills/{'tên-skill'}/</code> — anh có thể chỉnh sửa nội dung để mô tả chi tiết hơn.
            </p>
          </div>
        </div>
      )}

      {/* Danh sách skills */}
      {!skills || skills.length === 0 ? (
        <EmptyState
          icon={BookOpen}
          title="Chưa có custom skill nào"
          description="Bấm 'Tạo Skill' để tạo mới từ dashboard"
          action={
            <button
              onClick={() => setShowForm(true)}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-medium text-white hover:bg-accent-dark"
            >
              Tạo Skill
            </button>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {skills.map((skill) => (
            <SkillCard key={skill.name} skill={skill} />
          ))}
        </div>
      )}
    </div>
  );
}
