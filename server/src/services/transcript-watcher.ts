import { existsSync, readFileSync, watch, FSWatcher } from 'fs';
import { readdirSync, statSync } from 'fs';
import { join, relative, basename } from 'path';
import { config } from '../config.js';
import { addServerLog } from './log-service.js';
import { logger } from '../utils/logger.js';

interface WatchedFile {
  path: string;
  size: number;
  lastRead: number;
}

const watchedFiles = new Map<string, WatchedFile>();
let projectsWatcher: FSWatcher | null = null;
let pollTimer: ReturnType<typeof setInterval> | null = null;

/**
 * Parse a JSONL line into a readable log message
 */
function parseTranscriptLine(raw: string): { level: string; message: string } | null {
  try {
    const parsed = JSON.parse(raw);
    const type = parsed.type || '';

    if (type === 'user' && parsed.message?.content) {
      const text = parsed.message.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join(' ').slice(0, 300);
      return text ? { level: 'info', message: `👤 User: ${text}` } : null;
    }

    if (type === 'assistant' && parsed.message?.content) {
      const text = parsed.message.content
        .filter((c: any) => c.type === 'text')
        .map((c: any) => c.text)
        .join(' ').slice(0, 300);
      if (text) return { level: 'info', message: `🤖 Claude: ${text}` };

      const toolUse = parsed.message.content
        .filter((c: any) => c.type === 'tool_use')
        .map((c: any) => c.name);
      if (toolUse.length > 0) {
        return { level: 'info', message: `🔧 Tool call: ${toolUse.join(', ')}` };
      }
      return null;
    }

    if (type === 'result') {
      const cost = parsed.totalCost ? ` ($${parsed.totalCost.toFixed(4)})` : '';
      return { level: 'info', message: `📊 Session result${cost}` };
    }

    if (type === 'ai-title') {
      return { level: 'info', message: `📝 Title: ${parsed.title || ''}` };
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Read new lines from a transcript file since the last read position
 */
function readNewLines(file: WatchedFile): number {
  try {
    if (!existsSync(file.path)) return 0;

    const stats = statSync(file.path);
    if (stats.size <= file.size) return 0;

    const fd = readFileSync(file.path, 'utf-8');
    const lines = fd.split('\n').filter(Boolean);

    const newLines = lines.slice(file.lastRead);
    file.lastRead = lines.length;
    file.size = stats.size;

    for (const line of newLines) {
      const parsed = parseTranscriptLine(line);
      if (parsed) {
        const sessionId = basename(file.path).replace('.jsonl', '').slice(0, 8);
        addServerLog(parsed.level, `[${sessionId}] ${parsed.message}`, 'claude-session');
      }
    }

    return newLines.length;
  } catch {
    return 0;
  }
}

/**
 * Scan all project directories for transcript files and watch them
 */
function scanAndWatchTranscripts(): void {
  if (!existsSync(config.claudeProjectsDir)) return;

  try {
    const projectSlugs = readdirSync(config.claudeProjectsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const slug of projectSlugs) {
      const projectDir = join(config.claudeProjectsDir, slug);
      const files = readdirSync(projectDir).filter(f => f.endsWith('.jsonl'));

      for (const file of files) {
        const fullPath = join(projectDir, file);
        if (!watchedFiles.has(fullPath)) {
          try {
            const stats = statSync(fullPath);
            const lines = readFileSync(fullPath, 'utf-8').split('\n').filter(Boolean);
            watchedFiles.set(fullPath, {
              path: fullPath,
              size: stats.size,
              lastRead: lines.length,
            });
          } catch { /* ignore */ }
        }
      }
    }
  } catch { /* ignore */ }
}

/**
 * Poll all watched files for new lines
 */
function pollAllFiles(): void {
  let totalNew = 0;
  for (const [, file] of watchedFiles) {
    totalNew += readNewLines(file);
  }
}

/**
 * Start watching all transcript files in the projects directory
 */
export function startTranscriptWatcher(intervalMs = 2000): void {
  // Do initial scan
  scanAndWatchTranscripts();
  // Read initial content from all files
  pollAllFiles();
  logger.info(`Watching ${watchedFiles.size} transcript files`);

  // Watch for new files being created
  try {
    if (existsSync(config.claudeProjectsDir)) {
      projectsWatcher = watch(config.claudeProjectsDir, (eventType, filename) => {
        if (eventType === 'rename') {
          // New project directory or file created — rescan
          setTimeout(() => {
            const before = watchedFiles.size;
            scanAndWatchTranscripts();
            if (watchedFiles.size > before) {
              logger.info(`Found ${watchedFiles.size - before} new transcript files`);
            }
          }, 500);
        }
      });
    }
  } catch (error) {
    logger.warn({ error }, 'Could not watch projects directory');
  }

  // Poll for new content periodically
  pollTimer = setInterval(pollAllFiles, intervalMs);
}

/**
 * Stop the transcript watcher
 */
export function stopTranscriptWatcher(): void {
  if (pollTimer) {
    clearInterval(pollTimer);
    pollTimer = null;
  }
  if (projectsWatcher) {
    projectsWatcher.close();
    projectsWatcher = null;
  }
  watchedFiles.clear();
}
