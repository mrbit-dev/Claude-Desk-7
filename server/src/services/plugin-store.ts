import { execSync, exec } from 'child_process';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';

interface PluginInfo {
  name: string;
  source: string;
  installed: boolean;
  installLocation?: string;
  version?: string;
  description?: string;
}

/**
 * List currently installed plugins (via CLI)
 */
export function listInstalledPlugins(): PluginInfo[] {
  try {
    const output = execSync(`${config.claudeExeShell} plugin list --json`, {
      encoding: 'utf-8',
      windowsHide: true,
      timeout: 10000,
    }).trim();
    if (!output || output.includes('No plugins installed')) return [];
    try { return JSON.parse(output); } catch { return []; }
  } catch {
    return [];
  }
}

/**
 * Install a plugin by name using the Claude CLI
 */
export function installPlugin(name: string): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    exec(`${config.claudeExeShell} plugin install ${name}`, {
      windowsHide: true,
      timeout: 30000,
    }, (error, stdout, stderr) => {
      if (error) {
        logger.error({ error, stderr }, `Failed to install plugin: ${name}`);
        resolve({ success: false, message: stderr || error.message });
      } else {
        logger.info({ name }, 'Plugin installed successfully');
        resolve({ success: true, message: stdout });
      }
    });
  });
}

/**
 * Uninstall a plugin by name
 */
export function uninstallPlugin(name: string): Promise<{ success: boolean; message: string }> {
  return new Promise((resolve) => {
    exec(`${config.claudeExeShell} plugin uninstall ${name}`, {
      windowsHide: true,
      timeout: 30000,
    }, (error, stdout, stderr) => {
      if (error) {
        logger.error({ error, stderr }, `Failed to uninstall plugin: ${name}`);
        resolve({ success: false, message: stderr || error.message });
      } else {
        logger.info({ name }, 'Plugin uninstalled successfully');
        resolve({ success: true, message: stdout });
      }
    });
  });
}

/**
 * Browse available plugins from marketplace
 */
export function getMarketplacePlugins(): PluginInfo[] {
  const plugins: PluginInfo[] = [];

  try {
    const marketplacesDir = join(config.claudePluginsDir, 'marketplaces');
    if (!existsSync(marketplacesDir)) return plugins;

    // Read the official plugin index
    const officialDir = join(marketplacesDir, 'claude-plugins-official');
    if (!existsSync(officialDir)) return plugins;

    // Look for plugin list files
    const items = readdirSync(officialDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const name of items) {
      const pluginDir = join(officialDir, name);
      const packageJsonPath = join(pluginDir, 'package.json');
      let description = '';

      if (existsSync(packageJsonPath)) {
        try {
          const pkg = JSON.parse(readFileSync(packageJsonPath, 'utf-8'));
          description = pkg.description || '';
        } catch { /* ignore */ }
      }

      plugins.push({
        name,
        source: 'official',
        installed: false,
        description,
      });
    }
  } catch (error) {
    logger.error({ error }, 'Failed to read marketplace');
  }

  return plugins;
}
