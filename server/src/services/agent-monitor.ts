import { execSync } from 'child_process';
import { readdirSync, readFileSync, existsSync } from 'fs';
import { join } from 'path';
import { config } from '../config.js';
import { AgentInfo, SubAgentMeta } from '../types/claude.js';
import { broadcastEvent } from '../websocket/handler.js';
import { logger } from '../utils/logger.js';
import { findTranscriptPath } from '../utils/paths.js';

let pollInterval: ReturnType<typeof setInterval> | null = null;
let previousAgents: AgentInfo[] = [];
let previousTree: AgentTreeNode[] = [];
let isPolling = false;

export interface AgentTreeNode {
  sessionId: string;
  name: string;
  kind: string;
  pid?: number;
  cwd?: string;
  startedAt?: number;
  description?: string;
  spawnDepth?: number;
  children: AgentTreeNode[];
}

/**
 * Get currently active agents via CLI
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
 * Get all agents including completed ones
 */
export function getAllAgents(): AgentInfo[] {
  try {
    const output = execSync(`${config.claudeExeShell} agents --all --json`, {
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
 * Read last message from a session transcript to show "current activity"
 */
function getLastActivity(sessionId: string, _cwd: string): string {
  const transcriptPath = findTranscriptPath(sessionId);
  if (!transcriptPath) return '';

  try {
    const content = readFileSync(transcriptPath, 'utf-8');
    const lines = content.split('\n').filter(Boolean);
    // Read from the end to find the latest meaningful message
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const line = JSON.parse(lines[i]);
        // User message
        if (line.type === 'user') {
          const text = line.message?.content
            ?.filter((c: any) => c.type === 'text')
            .map((c: any) => c.text)
            .join(' ') || '';
          if (text) return `👤 ${text.slice(0, 300)}`;
        }
        // Assistant text response
        if (line.type === 'assistant' && line.message?.content) {
          const text = line.message.content
            .filter((c: any) => c.type === 'text')
            .map((c: any) => c.text)
            .join(' ') || '';
          if (text) return `🤖 ${text.slice(0, 300)}`;
          // Tool use
          const tools = line.message.content
            .filter((c: any) => c.type === 'tool_use')
            .map((c: any) => `🔧 ${c.name}`);
          if (tools.length > 0) return tools.slice(0, 3).join(' · ');
        }
      } catch { /* skip unparseable */ }
    }
  } catch { /* ignore */ }
  return '';
}

/**
 * Build a full agent tree by scanning project directories for sub-agents
 */
export function buildAgentTree(): AgentTreeNode[] {
  const roots: AgentTreeNode[] = [];
  const activeAgents = getActiveAgents();

  for (const agent of activeAgents) {
    // Get last activity from transcript
    const activity = agent.sessionId ? getLastActivity(agent.sessionId, agent.cwd || '') : '';

    const node: AgentTreeNode = {
      sessionId: agent.sessionId,
      name: agent.name || 'Unnamed',
      kind: agent.kind || 'interactive',
      pid: agent.pid,
      cwd: agent.cwd,
      startedAt: agent.startedAt,
      description: activity,
      children: [],
    };

    // Discover sub-agents
    if (agent.sessionId) {
      const subDir = join(config.claudeProjectsDir, sanitizeCwd(agent.cwd || ''), agent.sessionId, 'subagents');
      node.children = discoverSubAgentTree(subDir);
    }

    roots.push(node);
  }

  return roots;
}

/**
 * Discover sub-agent tree recursively
 */
function discoverSubAgentTree(subDir: string): AgentTreeNode[] {
  const children: AgentTreeNode[] = [];

  if (!existsSync(subDir)) return children;

  try {
    const metaFiles = readdirSync(subDir).filter(f => f.endsWith('.meta.json'));

    for (const metaFile of metaFiles) {
      try {
        const content = readFileSync(join(subDir, metaFile), 'utf-8');
        const meta = JSON.parse(content);

        const agentId = metaFile.replace('.meta.json', '');
        const node: AgentTreeNode = {
          sessionId: meta.sessionId || agentId,
          name: meta.description || meta.agentType || agentId.slice(0, 8),
          kind: meta.agentType || 'sub-agent',
          description: meta.description,
          spawnDepth: meta.spawnDepth,
          children: [],
        };

        // Find transcript lines to show what this agent is doing
        const transcriptPath = join(subDir.replace('subagents', ''), `${meta.sessionId || agentId}.jsonl`);
        if (existsSync(transcriptPath)) {
          try {
            const lines = readFileSync(transcriptPath, 'utf-8').split('\n').filter(Boolean);
            // Find the latest user/assistant message for a preview
            for (let i = lines.length - 1; i >= 0; i--) {
              try {
                const line = JSON.parse(lines[i]);
                if (line.type === 'user') {
                  const text = line.message?.content
                    ?.filter((c: any) => c.type === 'text')
                    .map((c: any) => c.text)
                    .join(' ') || '';
                  if (text) {
                    node.description = text.slice(0, 200);
                    break;
                  }
                }
              } catch { /* ignore */ }
            }
          } catch { /* ignore */ }
        }

        // Try to find deeper sub-agents for this one
        const deeperSubDir = join(subDir.replace('subagents', ''), agentId, 'subagents');
        const deeper = discoverSubAgentTree(deeperSubDir);
        node.children.push(...deeper);

        children.push(node);
      } catch { /* skip malformed meta */ }
    }
  } catch { /* ignore */ }

  return children;
}

/**
 * Sanitize cwd to match project directory naming convention
 */
function sanitizeCwd(cwd: string): string {
  return cwd
    .toLowerCase()
    .replace(/^[a-z]:/, (m) => m.replace(':', ''))
    .replace(/[^a-z0-9]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/**
 * Start polling for agents at the given interval
 */
export function startAgentPolling(intervalMs = 3000): void {
  if (isPolling) return;
  isPolling = true;

  const poll = async () => {
    try {
      const agents = getActiveAgents();
      const tree = buildAgentTree();

      const agentsChanged = JSON.stringify(agents) !== JSON.stringify(previousAgents);
      const treeChanged = JSON.stringify(tree) !== JSON.stringify(previousTree);

      if (agentsChanged) {
        previousAgents = agents;
        broadcastEvent({ type: 'agent:update', agents });
      }

      if (treeChanged) {
        previousTree = tree;
        broadcastEvent({ type: 'agent:tree-update', tree });
      }
    } catch (error) {
      logger.error({ error }, 'Agent poll failed');
    }
  };

  poll(); // immediate first poll
  pollInterval = setInterval(poll, intervalMs);
}

/**
 * Stop agent polling
 */
export function stopAgentPolling(): void {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
  isPolling = false;
}

/**
 * Get current cached agents (from last poll)
 */
export function getCachedAgents(): AgentInfo[] {
  return previousAgents;
}

/**
 * Get current agent tree
 */
export function getCachedAgentTree(): AgentTreeNode[] {
  return previousTree;
}
