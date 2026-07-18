import { spawn } from 'child_process';
import { getMCPServer } from './mcp-store.js';
import { logger } from '../utils/logger.js';
import type { MCPTool } from '../types/claude.js';

interface ToolCache {
  tools: MCPTool[];
  fetchedAt: number;
}

const toolCache = new Map<string, ToolCache>();
const CACHE_TTL = 60_000; // 60s

// MCP log ring buffers: serverName -> log lines
export const mcpLogBuffers = new Map<string, string[]>();
const MAX_LOG_LINES = 200;

export function addMCPLog(serverName: string, text: string, stream: 'stdout' | 'stderr'): void {
  if (!mcpLogBuffers.has(serverName)) {
    mcpLogBuffers.set(serverName, []);
  }
  const buf = mcpLogBuffers.get(serverName)!;
  buf.push(`[${stream}] ${text}`);
  if (buf.length > MAX_LOG_LINES) {
    buf.splice(0, buf.length - MAX_LOG_LINES);
  }
}

export function getMCPLogs(serverName: string): string[] {
  return mcpLogBuffers.get(serverName) || [];
}

export function clearMCPLogs(serverName: string): void {
  mcpLogBuffers.delete(serverName);
}

/**
 * Discover tools from an MCP server via JSON-RPC tools/list.
 * Spawns the server, sends a JSON-RPC request, reads response, then kills.
 */
export async function discoverTools(serverName: string): Promise<{ tools: MCPTool[]; cached: boolean }> {
  // Check cache first
  const cached = toolCache.get(serverName);
  if (cached && Date.now() - cached.fetchedAt < CACHE_TTL) {
    return { tools: cached.tools, cached: true };
  }

  const server = getMCPServer(serverName);
  if (!server) throw new Error(`MCP server "${serverName}" not found`);

  return new Promise((resolve, reject) => {
    const child = spawn(server.command, server.args, {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...server.env },
    });

    const stdoutChunks: string[] = [];
    const stderrChunks: string[] = [];
    let resolved = false;

    // Send JSON-RPC tools/list request
    const request = JSON.stringify({ jsonrpc: '2.0', id: '1', method: 'tools/list' }) + '\n';
    child.stdin?.write(request);
    child.stdin?.end();

    child.stdout?.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8');
      stdoutChunks.push(text);
      addMCPLog(serverName, text, 'stdout');
    });

    child.stderr?.on('data', (chunk: Buffer) => {
      const text = chunk.toString('utf-8');
      stderrChunks.push(text);
      addMCPLog(serverName, text, 'stderr');
    });

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { child.kill(); } catch { /* */ }
        // Try to parse whatever we have
        const tools = tryParseTools(stdoutChunks.join(''));
        if (tools.length > 0) {
          toolCache.set(serverName, { tools, fetchedAt: Date.now() });
          resolve({ tools, cached: false });
        } else {
          reject(new Error('MCP tool discovery timed out'));
        }
      }
    }, 10_000);

    child.on('error', (err: Error) => {
      clearTimeout(timeout);
      if (!resolved) {
        resolved = true;
        reject(new Error(`Failed to start MCP server: ${err.message}`));
      }
    });

    child.on('exit', (code) => {
      clearTimeout(timeout);
      if (resolved) return;
      resolved = true;

      const allStdout = stdoutChunks.join('');
      const tools = tryParseTools(allStdout);

      if (tools.length > 0) {
        toolCache.set(serverName, { tools, fetchedAt: Date.now() });
        resolve({ tools, cached: false });
      } else {
        const stderr = stderrChunks.join('').slice(0, 500);
        reject(new Error(stderr || `MCP server exited with code ${code}`));
      }
    });
  });
}

/**
 * Call a specific tool on an MCP server (playground).
 */
export async function callTool(serverName: string, toolName: string, args: Record<string, unknown>): Promise<{ result: unknown; duration: number }> {
  const server = getMCPServer(serverName);
  if (!server) throw new Error(`MCP server "${serverName}" not found`);

  const start = Date.now();

  return new Promise((resolve, reject) => {
    const child = spawn(server.command, server.args, {
      windowsHide: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      env: { ...process.env, ...server.env },
    });

    const stdoutChunks: string[] = [];
    let resolved = false;

    const request = JSON.stringify({
      jsonrpc: '2.0',
      id: '1',
      method: 'tools/call',
      params: { name: toolName, arguments: args },
    }) + '\n';

    child.stdin?.write(request);
    child.stdin?.end();

    child.stdout?.on('data', (chunk: Buffer) => {
      stdoutChunks.push(chunk.toString('utf-8'));
    });

    const timeout = setTimeout(() => {
      if (!resolved) {
        resolved = true;
        try { child.kill(); } catch { /* */ }
        reject(new Error('Tool call timed out'));
      }
    }, 30_000);

    child.on('error', (err: Error) => {
      clearTimeout(timeout);
      if (!resolved) { resolved = true; reject(err); }
    });

    child.on('exit', () => {
      clearTimeout(timeout);
      if (resolved) return;
      resolved = true;

      const allStdout = stdoutChunks.join('');
      const duration = Date.now() - start;

      try {
        // Try to parse last JSON line as response
        const lines = allStdout.split('\n').filter(Boolean);
        for (let i = lines.length - 1; i >= 0; i--) {
          try {
            const parsed = JSON.parse(lines[i]);
            if (parsed.result) {
              resolve({ result: parsed.result, duration });
              return;
            }
          } catch { /* skip unparseable lines */ }
        }
        resolve({ result: allStdout.slice(0, 2000), duration });
      } catch {
        resolve({ result: allStdout.slice(0, 2000), duration });
      }
    });
  });
}

function tryParseTools(output: string): MCPTool[] {
  try {
    const lines = output.split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const parsed = JSON.parse(line);
        if (parsed.result?.tools && Array.isArray(parsed.result.tools)) {
          return parsed.result.tools.map((t: any) => ({
            name: t.name,
            description: t.description || '',
            inputSchema: t.inputSchema,
          }));
        }
      } catch { /* skip */ }
    }
  } catch { /* */ }
  return [];
}

export function clearToolCache(serverName?: string): void {
  if (serverName) {
    toolCache.delete(serverName);
  } else {
    toolCache.clear();
  }
}
