import { execSync } from 'child_process';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { homedir } from 'os';
import { logger } from '../utils/logger.js';

const CLAUDE_PROJECTS_DIR = join(homedir(), '.claude', 'projects');

export interface GitInfo {
  branch: string;
  lastCommit: {
    hash: string;
    message: string;
    author: string;
    date: string;
  };
  status: {
    modified: string[];
    added: string[];
    deleted: string[];
  };
}

// In-memory cache with 30s TTL
const cache = new Map<string, { data: GitInfo; expiry: number }>();
const CACHE_TTL = 30_000;

function getProjectDir(slug: string): string | null {
  const projectDir = join(CLAUDE_PROJECTS_DIR, slug);
  if (!existsSync(projectDir)) return null;

  try {
    const files = readdirSync(projectDir)
      .filter(f => f.endsWith('.jsonl'))
      .sort()
      .reverse();

    if (files.length === 0) return null;

    const newestFile = join(projectDir, files[0]);
    const firstLine = readFileSync(newestFile, 'utf-8').split('\n')[0]?.trim();
    if (!firstLine) return null;

    const parsed = JSON.parse(firstLine);
    const cwd: string | undefined = parsed.cwd;
    return cwd || null;
  } catch {
    return null;
  }
}

function runGitCommand(cwd: string, command: string): string {
  return execSync(command, {
    cwd,
    encoding: 'utf-8',
    timeout: 5000,
    windowsHide: true,
  }).trim();
}

export function getGitInfo(slug: string): GitInfo | null {
  // Check cache first
  const cached = cache.get(slug);
  if (cached && cached.expiry > Date.now()) {
    return cached.data;
  }

  try {
    const projectDir = getProjectDir(slug);
    if (!projectDir) return null;

    // Verify it's a git repo
    if (!existsSync(join(projectDir, '.git'))) return null;

    // Git branch
    const branch = runGitCommand(projectDir, 'git rev-parse --abbrev-ref HEAD');

    // Last commit
    const logOutput = runGitCommand(
      projectDir,
      'git log -1 --format=\'%H%n%s%n%an%n%aI\''
    );
    const [hash, message, author, date] = logOutput.split('\n');

    // Git status
    const statusOutput = runGitCommand(projectDir, 'git status --porcelain');
    const modified: string[] = [];
    const added: string[] = [];
    const deleted: string[] = [];

    for (const line of statusOutput.split('\n')) {
      if (!line.trim()) continue;
      const code = line.slice(0, 2).trim();
      const file = line.slice(3).trim();
      if (code === 'M' || code === 'MM') modified.push(file);
      else if (code === 'A') added.push(file);
      else if (code === 'D' || code === 'DD') deleted.push(file);
      else if (code === '??') added.push(file);
      else if (code.startsWith('R')) {
        // Rename: "R  old -> new" — add the new name as modified
        const parts = file.split(' -> ');
        modified.push(parts[parts.length - 1] || file);
      }
    }

    const result: GitInfo = {
      branch,
      lastCommit: {
        hash: hash || '',
        message: message || '',
        author: author || '',
        date: date || '',
      },
      status: { modified, added, deleted },
    };

    // Update cache
    cache.set(slug, { data: result, expiry: Date.now() + CACHE_TTL });

    return result;
  } catch (error) {
    logger.debug({ error, slug }, 'Git info not available for project');
    return null;
  }
}
