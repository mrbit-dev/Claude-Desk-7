import { readFileSync, writeFileSync, existsSync, mkdirSync, renameSync, readdirSync, unlinkSync } from 'fs';
import { join } from 'path';
import { config } from '../config.js';
import { ClaudeSettings } from '../types/claude.js';
import { logger } from '../utils/logger.js';

/**
 * Read and parse settings.json with defaults
 */
export function readSettings(): ClaudeSettings {
  try {
    if (!existsSync(config.claudeSettingsFile)) {
      return {};
    }
    const raw = readFileSync(config.claudeSettingsFile, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    logger.error({ error }, 'Failed to read settings.json');
    return {};
  }
}

/**
 * Write settings.json atomically (write to tmp, rename)
 */
export function writeSettings(settings: ClaudeSettings): ClaudeSettings {
  try {
    // Create backup if settings exist
    if (existsSync(config.claudeSettingsFile)) {
      createBackup();
    }

    // Atomic write: write to temp file first, then rename
    const tmpFile = config.claudeSettingsFile + '.tmp';
    writeFileSync(tmpFile, JSON.stringify(settings, null, 2), 'utf-8');
    // Rename is atomic on the same filesystem
    renameSync(tmpFile, config.claudeSettingsFile);

    return settings;
  } catch (error) {
    logger.error({ error }, 'Failed to write settings.json');
    throw error;
  }
}

/**
 * Backup current settings to ~/.claude/backups/
 */
function createBackup(): void {
  try {
    if (!existsSync(config.claudeBackupsDir)) {
      mkdirSync(config.claudeBackupsDir, { recursive: true });
    }
    const timestamp = Date.now();
    const backupFile = join(config.claudeBackupsDir, `.claude.json.backup.${timestamp}`);
    const content = readFileSync(config.claudeSettingsFile, 'utf-8');
    writeFileSync(backupFile, content, 'utf-8');

    // Clean old backups (keep last 20)
    const backups = readdirSync(config.claudeBackupsDir)
      .filter(f => f.startsWith('.claude.json.backup.'))
      .sort()
      .reverse();
    if (backups.length > 20) {
      for (const old of backups.slice(20)) {
        unlinkSync(join(config.claudeBackupsDir, old));
      }
    }
  } catch (error) {
    logger.warn({ error }, 'Failed to create settings backup');
  }
}

/**
 * Merge partial settings into existing (deep merge)
 */
export function mergeSettings(partial: Partial<ClaudeSettings>): ClaudeSettings {
  const current = readSettings();
  const merged: ClaudeSettings = { ...current };

  if (partial.env) {
    merged.env = { ...current.env, ...partial.env };
  }
  if (partial.mcpServers) {
    merged.mcpServers = { ...current.mcpServers, ...partial.mcpServers };
  }
  if (partial.skills) {
    merged.skills = { ...current.skills, ...partial.skills };
  }
  if (partial.model !== undefined) merged.model = partial.model;
  if (partial.theme !== undefined) merged.theme = partial.theme;
  if (partial.effortLevel !== undefined) merged.effortLevel = partial.effortLevel;

  return merged;
}
