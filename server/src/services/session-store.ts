import { existsSync, readFileSync } from 'fs';
import { readdirSync } from 'fs';
import { join, parse as parsePath } from 'path';
import { config } from '../config.js';
import {
  SessionFile,
  SessionSummary,
  HistoryEntry,
  TranscriptLine,
} from '../types/claude.js';
import { cwdToProjectSlug, findTranscriptPath, normalizePath } from '../utils/paths.js';
import { logger } from '../utils/logger.js';

/**
 * Read all active session files from ~/.claude/sessions/
 */
export function readActiveSessions(): SessionFile[] {
  const sessions: SessionFile[] = [];

  try {
    if (!existsSync(config.claudeSessionsDir)) return sessions;

    const files = readdirSync(config.claudeSessionsDir)
      .filter(f => f.endsWith('.json'));

    for (const file of files) {
      try {
        const content = readFileSync(join(config.claudeSessionsDir, file), 'utf-8');
        const session = JSON.parse(content) as SessionFile;
        sessions.push(session);
      } catch (error) {
        logger.warn({ file, error }, 'Failed to parse session file');
      }
    }
  } catch (error) {
    logger.error({ error }, 'Failed to read active sessions');
  }

  return sessions;
}

/**
 * Read prompt history from history.jsonl
 */
export function readHistory(): HistoryEntry[] {
  const entries: HistoryEntry[] = [];

  try {
    if (!existsSync(config.claudeHistoryFile)) return entries;

    const content = readFileSync(config.claudeHistoryFile, 'utf-8');
    const lines = content.split('\n').filter(Boolean);

    for (const line of lines) {
      try {
        const entry = JSON.parse(line) as HistoryEntry;
        entries.push(entry);
      } catch { /* skip malformed lines */ }
    }
  } catch (error) {
    logger.error({ error }, 'Failed to read history.jsonl');
  }

  return entries;
}

/**
 * Get all sessions (active + history)
 */
export function getAllSessions(): SessionSummary[] {
  const activeSessions = readActiveSessions();
  const history = readHistory();
  const projectMap = readProjectSessionMap();

  const summaryMap = new Map<string, SessionSummary>();

  // Add active sessions
  for (const s of activeSessions) {
    summaryMap.set(s.sessionId, {
      ...s,
      status: 'active',
      project: normalizePath(s.cwd || ''),
      startedAt: s.startedAt,
    });
  }

  // Merge with history entries
  for (const h of history) {
    const existing = summaryMap.get(h.sessionId);
    if (existing) {
      existing.display = h.display;
    } else {
      summaryMap.set(h.sessionId, {
        sessionId: h.sessionId,
        cwd: h.project,
        kind: 'interactive',
        status: 'completed',
        display: h.display,
        project: normalizePath(h.project),
        startedAt: h.timestamp,
      });
    }
  }

  // Cross-reference with project sessions for transcript availability
  for (const [sessionId, summary] of summaryMap) {
    const projectSlug = cwdToProjectSlug(summary.cwd);
    if (projectMap.has(projectSlug)) {
      const sessions = projectMap.get(projectSlug)!;
      if (!sessions.includes(sessionId)) {
        // Might be in history but no transcript
      }
    }
  }

  return Array.from(summaryMap.values())
    .sort((a, b) => b.startedAt - a.startedAt);
}

/**
 * Check if a PID is still alive
 */
export function isPidAlive(pid: number): boolean {
  try {
    return process.kill(pid, 0);
  } catch {
    return false;
  }
}

/**
 * Read project directory structure to map slug → session IDs
 */
export function readProjectSessionMap(): Map<string, string[]> {
  const projectMap = new Map<string, string[]>();

  try {
    if (!existsSync(config.claudeProjectsDir)) return projectMap;

    const slugs = readdirSync(config.claudeProjectsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const slug of slugs) {
      const projectDir = join(config.claudeProjectsDir, slug);
      const files = readdirSync(projectDir).filter(f => f.endsWith('.jsonl'));
      const sessionIds = files.map(f => parsePath(f).name);
      projectMap.set(slug, sessionIds);
    }
  } catch (error) {
    logger.error({ error }, 'Failed to read project map');
  }

  return projectMap;
}

/**
 * Read a transcript file and return parsed lines
 */
export function readTranscript(
  sessionId: string,
  options?: { limit?: number; offset?: number }
): TranscriptLine[] {
  const transcriptPath = findTranscriptPath(sessionId);

  if (!transcriptPath) return [];

  const lines: TranscriptLine[] = [];

  // For synchronous reading, read the whole file and parse line by line
  const content = readFileSync(transcriptPath, 'utf-8');
  const allLines = content.split('\n').filter(Boolean);

  const start = options?.offset || 0;
  const end = options?.limit ? start + options.limit : allLines.length;

  for (let i = start; i < Math.min(end, allLines.length); i++) {
    try {
      const parsed = JSON.parse(allLines[i]) as TranscriptLine;
      lines.push(parsed);
    } catch { /* skip malformed lines */ }
  }

  return lines;
}

/**
 * Get total transcript line count
 */
export function getTranscriptCount(sessionId: string): number {
  const transcriptPath = findTranscriptPath(sessionId);
  if (!transcriptPath) return 0;

  const content = readFileSync(transcriptPath, 'utf-8');
  return content.split('\n').filter(Boolean).length;
}
