import { existsSync, readdirSync, readFileSync, statSync, rmSync, unlinkSync } from 'fs';
import { join } from 'path';
import { config } from '../config.js';
import { ProjectSummary } from '../types/claude.js';
import { slugToOriginalPath } from '../utils/paths.js';
import { logger } from '../utils/logger.js';

/**
 * Get all projects with summary info
 */
export function getAllProjects(): ProjectSummary[] {
  const projects: ProjectSummary[] = [];

  try {
    if (!existsSync(config.claudeProjectsDir)) return projects;

    const slugs = readdirSync(config.claudeProjectsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const slug of slugs) {
      const projectDir = join(config.claudeProjectsDir, slug);
      const files = readdirSync(projectDir).filter(f => f.endsWith('.jsonl'));
      const sessionIds = files.map(f => f.replace('.jsonl', ''));

      // Calculate total size and last activity
      let totalSize = 0;
      let lastActivity = 0;

      for (const file of files) {
        const stats = statSync(join(projectDir, file));
        totalSize += stats.size;
        if (stats.mtimeMs > lastActivity) lastActivity = stats.mtimeMs;
      }

      projects.push({
        slug,
        originalPath: slugToOriginalPath(slug),
        sessionCount: sessionIds.length,
        totalSize,
        lastActivity,
        sessions: sessionIds,
      });
    }
  } catch (error) {
    logger.error({ error }, 'Failed to read projects');
  }

  return projects.sort((a, b) => b.lastActivity - a.lastActivity);
}

/**
 * Get a single project by slug with all session metadata
 */
export function getProjectDetail(slug: string): ProjectSummary | null {
  const projects = getAllProjects();
  return projects.find(p => p.slug === slug) || null;
}

/**
 * Purge a project's Claude Code state (delete session files)
 */
export function purgeProject(slug: string, purgeSessions?: boolean): { success: boolean; sessionsRemoved: number } {
  const projectDir = join(config.claudeProjectsDir, slug);
  if (!existsSync(projectDir)) {
    return { success: false, sessionsRemoved: 0 };
  }

  let removed = 0;

  try {
    if (purgeSessions) {
      const entries = readdirSync(projectDir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = join(projectDir, entry.name);
        if (entry.isDirectory()) {
          rmSync(fullPath, { recursive: true, force: true });
          removed++;
        } else if (entry.name.endsWith('.jsonl')) {
          unlinkSync(fullPath);
          removed++;
        }
      }
    }

    return { success: true, sessionsRemoved: removed };
  } catch (error) {
    logger.error({ error, slug }, 'Failed to purge project');
    return { success: false, sessionsRemoved: removed };
  }
}
