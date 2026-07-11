import { join, resolve } from 'path';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { config } from '../config.js';

/**
 * Normalize any path to forward slashes for internal use
 */
export function normalizePath(p: string): string {
  return p.replace(/\\/g, '/');
}

/**
 * Convert internal path back to Windows style (backslashes)
 */
export function toWindowsPath(p: string): string {
  return p.replace(/\//g, '\\');
}

/**
 * Convert a cwd path to its project slug (directory name in ~/.claude/projects/)
 * E.g. "E:\laragon\www\demo.agent" → "e--laragon-www-demo-agent"
 */
export function cwdToProjectSlug(cwd: string): string {
  return normalizePath(cwd)
    .toLowerCase()
    .replace(/^[a-z]:/, (m) => m.replace(':', ''))
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Try to find a session's JSONL by scanning all project dirs
 */
export function findTranscriptPath(sessionId: string): string | null {
  const projectsDir = config.claudeProjectsDir;
  if (!existsSync(projectsDir)) return null;

  const slugs = readdirSync(projectsDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  for (const slug of slugs) {
    // Try: projects/<slug>/<sessionId>.jsonl
    const candidate = join(projectsDir, slug, `${sessionId}.jsonl`);
    if (existsSync(candidate)) return candidate;

    // Try: projects/<slug>/<sessionId>/<sessionId>.jsonl
    const subDirCandidate = join(projectsDir, slug, sessionId, `${sessionId}.jsonl`);
    if (existsSync(subDirCandidate)) return subDirCandidate;

    // Try: projects/<sessionId>.jsonl (flat)
    const topCandidate = join(projectsDir, `${sessionId}.jsonl`);
    if (existsSync(topCandidate)) return topCandidate;
  }
  return null;
}

/**
 * Reconstruct original project path from slug
 * (best-effort, since we lose some info in the slug encoding)
 */
export function slugToOriginalPath(slug: string): string {
  const projectsDir = config.claudeProjectsDir;
  const projectDir = join(projectsDir, slug);
  if (!existsSync(projectDir)) return slug;

  const files = readdirSync(projectDir)
    .filter(f => f.endsWith('.jsonl'))
    .sort((a, b) => b.localeCompare(a)); // newest first

  for (const file of files) {
    try {
      const firstLine = readFileSync(join(projectDir, file), 'utf-8').split('\n')[0];
      if (firstLine) {
        const parsed = JSON.parse(firstLine);
        if (parsed.cwd) return parsed.cwd;
      }
    } catch { /* skip */ }
  }
  return slug; // fallback
}

/**
 * Safe path check: ensures resolved path stays within the allowed base
 */
export function isPathWithin(base: string, target: string): boolean {
  const resolved = resolve(target);
  return resolved.startsWith(resolve(base));
}
