import { homedir } from 'os';
import { join } from 'path';
import { execSync, exec } from 'child_process';
import { existsSync } from 'fs';

const USER_HOME = homedir();
const CLAUDE_DIR = join(USER_HOME, '.claude');

/**
 * Auto-detect claude executable path
 * Works on any machine: Windows, macOS, Linux
 * Tìm claude.exe từ PATH, home directory, và các vị trí phổ biến
 */
function findClaudeExe(): string {
  const candidates = [
    // 1. Thử trực tiếp từ PATH (quan trọng nhất — hoạt động nếu người dùng đã cài)
    'claude',
    // 2. Windows: ~/.local/bin/claude.exe (vị trí mặc định khi cài)
    join(USER_HOME, '.local', 'bin', 'claude.exe'),
    // 3. Linux/macOS: ~/.local/bin/claude
    join(USER_HOME, '.local', 'bin', 'claude'),
    // 4. Windows: %LOCALAPPDATA%/claude/claude.exe
    join(process.env.LOCALAPPDATA || '', 'claude', 'claude.exe'),
  ];

  for (const candidate of candidates) {
    try {
      // Thử chạy --version để kiểm tra
      const result = execSync(`"${candidate}" --version 2>&1`, {
        encoding: 'utf-8',
        windowsHide: true,
        timeout: 3000,
      }).trim();
      if (result) {
        return candidate; // Trả về đường dẫn gốc, không thêm quotes — để `execSync`/`spawn` tự xử lý
      }
    } catch {
      continue;
    }
  }

  // Fallback cuối cùng — hy vọng có trong PATH
  return 'claude';
}

const claudeExe = findClaudeExe();

export const config = {
  port: parseInt(process.env.PORT || '3712', 10),

  // Claude paths — tất cả đều dùng homedir() động, không hardcode
  claudeDir: CLAUDE_DIR,
  claudeSessionsDir: join(CLAUDE_DIR, 'sessions'),
  claudeProjectsDir: join(CLAUDE_DIR, 'projects'),
  claudeHistoryFile: join(CLAUDE_DIR, 'history.jsonl'),
  claudeSettingsFile: join(CLAUDE_DIR, 'settings.json'),
  claudeSkillsDir: join(CLAUDE_DIR, 'skills'),
  claudePluginsDir: join(CLAUDE_DIR, 'plugins'),
  claudeBackupsDir: join(CLAUDE_DIR, 'backups'),
  claudeDaemonDir: join(CLAUDE_DIR, 'daemon'),

  // Claude executable (auto-detected) — dùng cho spawn()
  claudeExe,
  // Claude executable wrapped in quotes — dùng cho execSync()/exec() (shell command)
  claudeExeShell: claudeExe.includes(' ') ? `"${claudeExe}"` : claudeExe,

  // Logging
  logLevel: process.env.LOG_LEVEL || 'info',
} as const;
