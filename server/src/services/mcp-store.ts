import { spawn } from 'child_process';
import { readSettings, writeSettings, mergeSettings } from './settings-store.js';
import { MCPServerWithName } from '../types/claude.js';

/**
 * Get all configured MCP servers with status
 */
export function getAllMCPServers(): MCPServerWithName[] {
  const settings = readSettings();
  const servers: MCPServerWithName[] = [];

  if (settings.mcpServers) {
    for (const [name, config] of Object.entries(settings.mcpServers)) {
      servers.push({
        name,
        command: config.command,
        args: config.args || [],
        env: config.env,
        status: 'unknown',
      });
    }
  }

  return servers;
}

/**
 * Get a single MCP server by name
 */
export function getMCPServer(name: string): MCPServerWithName | null {
  const servers = getAllMCPServers();
  return servers.find(s => s.name === name) || null;
}

/**
 * Add a new MCP server
 */
export function addMCPServer(server: MCPServerWithName): MCPServerWithName {
  const settings = readSettings();
  const mcpServers = settings.mcpServers || {};

  mcpServers[server.name] = {
    command: server.command,
    args: server.args,
    env: server.env,
  };

  writeSettings({ ...settings, mcpServers });
  return server;
}

/**
 * Update an existing MCP server
 */
export function updateMCPServer(name: string, updates: Partial<MCPServerWithName>): MCPServerWithName | null {
  const settings = readSettings();
  const mcpServers = settings.mcpServers || {};

  if (!mcpServers[name]) return null;

  if (updates.command !== undefined) mcpServers[name].command = updates.command;
  if (updates.args !== undefined) mcpServers[name].args = updates.args;
  if (updates.env !== undefined) mcpServers[name].env = updates.env;

  writeSettings({ ...settings, mcpServers });
  return { name, ...mcpServers[name], status: 'unknown' };
}

/**
 * Delete an MCP server
 */
export function deleteMCPServer(name: string): boolean {
  const settings = readSettings();
  const mcpServers = settings.mcpServers || {};

  if (!mcpServers[name]) return false;

  delete mcpServers[name];
  writeSettings({ ...settings, mcpServers });
  return true;
}

/**
 * Perform a health check on an MCP server
 * (Try spawning the command briefly and check exit)
 */
export async function healthCheckMCPServer(name: string): Promise<{ alive: boolean; error?: string }> {
  const server = getMCPServer(name);
  if (!server) return { alive: false, error: 'Server not found' };

  return new Promise((resolve) => {
    const child = spawn(cmd, [...args, ...server.args], {
      windowsHide: true,
      stdio: 'ignore',
      env: { ...process.env, ...server.env },
      timeout: 5000,
    });

    const timeout = setTimeout(() => {
      try { child.kill(); } catch { /* ignore */ }
      resolve({ alive: false, error: 'Health check timed out' });
    }, 5000);

    child.on('error', (err: Error) => {
      clearTimeout(timeout);
      resolve({ alive: false, error: err.message });
    });

    child.on('exit', (code: number | null) => {
      clearTimeout(timeout);
      // Exit code 0 or null (killed by timeout) — if it started at all
      resolve({ alive: code === 0 || code === null });
    });
  });
}
