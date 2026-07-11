import { execSync } from 'child_process';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

interface AuthStatus {
  loggedIn: boolean;
  authMethod?: string;
  apiProvider?: string;
}

/**
 * Get Claude Code authentication status
 */
export function getAuthStatus(): AuthStatus {
  try {
    const output = execSync(`${config.claudeExeShell} auth status --json`, {
      encoding: 'utf-8',
      windowsHide: true,
      timeout: 10000,
    });
    return JSON.parse(output);
  } catch (error) {
    logger.warn({ error }, 'Failed to get auth status');
    return { loggedIn: false };
  }
}

/**
 * Get Claude Code version
 */
export function getClaudeVersion(): string {
  try {
    const output = execSync(`${config.claudeExeShell} -v`, {
      encoding: 'utf-8',
      windowsHide: true,
      timeout: 5000,
    });
    return output.trim();
  } catch {
    return 'unknown';
  }
}
