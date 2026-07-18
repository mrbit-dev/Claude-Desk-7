/**
 * Unified Agent Monitor
 * Merges Claude agents + Dashboard agents into a single unified tree
 * with real progress, tool activity from transcripts, and real-time streaming.
 */
import { execSync } from 'child_process';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { config } from '../config.js';
import { AgentInfo, AgentUnifiedNode, AgentActivity } from '../types/claude.js';
import { broadcastEvent } from '../websocket/handler.js';
import { getAllDashboardAgents } from './dashboard-agent-store.js';
import { logger } from '../utils/logger.js';

let pollInterval: ReturnType<typeof setInterval> | null = null;
let lastUnifiedHash = '';

/**
 * Get active agents from Claude CLI
 */
export function getActiveAgents(): AgentInfo[] {
  try {
    const output = execSync(`${config.claudeExeShell} agents --json`, {
      encoding: 'utf-8',
      windowsHide: true,
      timeout: 5000,
    });
    return JSON.parse(output);
  } catch {
    return [];
  }
}

/**
 * Read the latest transcript lines for a session to get tool_use/tool_result/thinking activity
 */
function getAgentActivity(sessionId: string): AgentActivity[] {
  const activities: AgentActivity[] = [];
  try {
    if (!existsSync(config.claudeProjectsDir)) return activities;
    const projects = readdirSync(config.claudeProjectsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const slug of projects) {
      const candidates = [
        join(config.claudeProjectsDir, slug, `${sessionId}.jsonl`),
        join(config.claudeProjectsDir, slug, sessionId, `${sessionId}.jsonl`),
      ];
      for (const filePath of candidates) {
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, 'utf-8');
          const lines = content.split('\n').filter(Boolean).slice(-30);
          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.type === 'assistant' && parsed.message?.content) {
                for (const block of parsed.message.content) {
                  if (block.type === 'tool_use') {
                    activities.push({ type: 'tool_use', toolName: block.name, toolInput: block.input, timestamp: parsed.timestamp || new Date().toISOString() });
                  } else if (block.type === 'tool_result') {
                    activities.push({ type: 'tool_result', toolName: '', summary: `Result for ${block.tool_use_id?.slice(0, 8)}`, timestamp: parsed.timestamp || new Date().toISOString() });
                  } else if (block.type === 'thinking') {
                    activities.push({ type: 'thinking', thinking: block.thinking?.slice(0, 500), timestamp: parsed.timestamp || new Date().toISOString() });
                  } else if (block.type === 'text') {
                    activities.push({ type: 'message', summary: block.text?.slice(0, 200), timestamp: parsed.timestamp || new Date().toISOString() });
                  }
                }
              }
            } catch { /* skip */ }
          }
          break;
        }
      }
    }
  } catch { /* ignore */ }
  return activities;
}

/**
 * Calculate real progress based on elapsed time
 */
function calcRealProgress(sessionId: string, startedAt?: number): number {
  if (startedAt) {
    const elapsed = Date.now() - startedAt;
    const estimatedMs = 180_000;
    return Math.min(Math.round((elapsed / estimatedMs) * 100), 95);
  }
  try {
    const activities = getAgentActivity(sessionId);
    const toolCalls = activities.filter(a => a.type === 'tool_use').length;
    return Math.min(Math.round((toolCalls / 8) * 100), 95);
  } catch {
    return 50;
  }
}

function sanitizeCwd(cwd: string): string {
  return cwd.toLowerCase().replace(/^[a-z]:/, (m) => m.replace(':', '')).replace(/[^a-z0-9]/g, '-').replace(/-+/g, '-').replace(/^-|-$/g, '');
}

function getAgentSource(pid?: number): string {
  if (!pid) return 'terminal';
  try {
    const sessionFile = join(config.claudeSessionsDir, `${pid}.json`);
    if (existsSync(sessionFile)) {
      const data = JSON.parse(readFileSync(sessionFile, 'utf-8'));
      const entrypoint = data.entrypoint || '';
      if (entrypoint.includes('vscode') || entrypoint === 'claude-vscode') return 'vscode';
      if (entrypoint.includes('desk') || entrypoint.includes('dashboard')) return 'dashboard';
    }
  } catch { /* */ }
  return 'terminal';
}

function discoverSubAgents(sessionId: string, cwd: string): AgentUnifiedNode[] {
  const children: AgentUnifiedNode[] = [];
  const subDir = join(config.claudeProjectsDir, sanitizeCwd(cwd), sessionId, 'subagents');
  if (!existsSync(subDir)) return children;
  try {
    const metaFiles = readdirSync(subDir).filter(f => f.endsWith('.meta.json'));
    for (const metaFile of metaFiles) {
      try {
        const content = readFileSync(join(subDir, metaFile), 'utf-8');
        const meta = JSON.parse(content);
        const agentId = metaFile.replace('.meta.json', '');
        const subSessionId = meta.sessionId || agentId;
        children.push({
          id: `${sessionId}-sub-${agentId}`,
          name: meta.description || meta.agentType || agentId.slice(0, 8),
          description: meta.description || 'Sub-agent',
          kind: meta.agentType || 'sub-agent',
          status: 'running',
          source: 'sub-agent',
          sessionId: subSessionId,
          progress: subSessionId ? calcRealProgress(subSessionId) : 30,
          activity: subSessionId ? getAgentActivity(subSessionId).slice(-5) : [],
          children: [],
        });
      } catch { /* */ }
    }
  } catch { /* */ }
  return children;
}

/**
 * Build unified agent tree: Claude agents + Dashboard agents + sub-agents
 */
export function buildUnifiedTree(): AgentUnifiedNode[] {
  const roots: AgentUnifiedNode[] = [];

  // 1. Claude agents from CLI
  const claudeAgents = getActiveAgents();
  for (const agent of claudeAgents) {
    const activity = getAgentActivity(agent.sessionId).slice(-10);
    const progress = calcRealProgress(agent.sessionId, agent.startedAt);
    const source = getAgentSource(agent.pid);

    const node: AgentUnifiedNode = {
      id: `claude-${agent.sessionId}`,
      name: agent.name || 'Unnamed Claude',
      description: activity.find(a => a.type === 'message')?.summary || 'Running...',
      kind: agent.kind || 'interactive',
      status: 'running',
      source: 'claude',
      sessionId: agent.sessionId,
      pid: agent.pid,
      cwd: agent.cwd,
      startedAt: agent.startedAt,
      progress,
      activity: activity.slice(-5),
      children: discoverSubAgents(agent.sessionId, agent.cwd || ''),
    };
    roots.push(node);
  }

  // 2. Dashboard agents — build hierarchy using 2-pass approach
  const dashAgents = getAllDashboardAgents();

  // First pass: create all nodes in a map
  const dashNodes = new Map<string, { node: AgentUnifiedNode; parentId?: string }>();
  for (const agent of dashAgents) {
    const node: AgentUnifiedNode = {
      id: `dash-${agent.id}`,
      name: agent.name,
      description: agent.detail || agent.description || 'Running...',
      kind: agent.kind || 'sub-agent',
      status: agent.status === 'error' ? 'error' : (agent.status as any),
      source: 'dashboard',
      sessionId: agent.id,
      progress: 50,
      activity: [],
      children: [],
    };
    dashNodes.set(node.id, { node, parentId: agent.parentId });
  }

  // Second pass: attach children to parents
  const attachedIds = new Set<string>();
  for (const [, { node, parentId }] of dashNodes) {
    if (parentId) {
      const parentKey = `dash-${parentId}`;
      const parentDash = dashNodes.get(parentKey);
      if (parentDash) {
        parentDash.node.children.push(node);
        attachedIds.add(node.id);
        continue;
      }
      // Try to attach to claude roots
      for (const root of roots) {
        if (root.sessionId === parentId || root.id === `dash-${parentId}`) {
          root.children.push(node);
          attachedIds.add(node.id);
          break;
        }
      }
    }
  }

  // Add unattached running dashboard agents as roots
  for (const [, { node }] of dashNodes) {
    if (!attachedIds.has(node.id) && node.status === 'running') {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * Broadcast unified agent sync event
 */
export function broadcastSync(): void {
  const roots = buildUnifiedTree();
  const hash = JSON.stringify(roots.map(r => ({ id: r.id, progress: r.progress, status: r.status, activityCount: r.activity.length })));
  if (hash !== lastUnifiedHash) {
    lastUnifiedHash = hash;
    broadcastEvent({ type: 'agents:sync', roots });
  }
}

/**
 * Start polling for unified agents
 */
export function startUnifiedPolling(intervalMs = 2000): void {
  if (pollInterval) return;
  const poll = () => { try { broadcastSync(); } catch (error) { logger.error({ error }, 'Unified agent poll failed'); } };
  poll();
  pollInterval = setInterval(poll, intervalMs);
}

export function stopUnifiedPolling(): void {
  if (pollInterval) { clearInterval(pollInterval); pollInterval = null; }
}

/**
 * Get live transcript content for a session
 */
export function getAgentTranscript(sessionId: string, limit = 20): any[] {
  const lines: any[] = [];
  try {
    if (!existsSync(config.claudeProjectsDir)) return lines;
    const projects = readdirSync(config.claudeProjectsDir, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
    for (const slug of projects) {
      const candidates = [
        join(config.claudeProjectsDir, slug, `${sessionId}.jsonl`),
        join(config.claudeProjectsDir, slug, sessionId, `${sessionId}.jsonl`),
      ];
      for (const filePath of candidates) {
        if (existsSync(filePath)) {
          const content = readFileSync(filePath, 'utf-8');
          const slice = content.split('\n').filter(Boolean).slice(-limit);
          for (const line of slice) { try { lines.push(JSON.parse(line)); } catch { /* */ } }
          return lines;
        }
      }
    }
  } catch { /* */ }
  return lines;
}

/**
 * Get agent log output
 */
export function getAgentLogs(sessionId: string): string[] {
  const logs: string[] = [];
  try {
    if (!existsSync(config.claudeSessionsDir)) return logs;
    const files = readdirSync(config.claudeSessionsDir).filter(f => f.endsWith('.json'));
    for (const file of files) {
      try {
        const content = JSON.parse(readFileSync(join(config.claudeSessionsDir, file), 'utf-8'));
        if (content.sessionId === sessionId || file.replace('.json', '') === sessionId) {
          logs.push(`[session] ${content.cwd || ''} | started: ${new Date(content.startedAt).toISOString()}`);
          logs.push(`[entrypoint] ${content.entrypoint || 'unknown'}`);
        }
      } catch { /* */ }
    }
  } catch { /* */ }
  return logs;
}
