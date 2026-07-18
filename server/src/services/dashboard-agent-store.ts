/**
 * Dashboard Agent Registry
 * Tracks agents spawned by the dashboard itself (launches, sub-agents, workflow agents)
 * and merges them with Claude's native agent list for display.
 */
import { v4 as uuidv4 } from 'uuid';
import { broadcastEvent } from '../websocket/handler.js';
import type { DashboardAgentInfo, DashboardAgentStatus } from '../types/claude.js';
import { logger } from '../utils/logger.js';

const dashboardAgents = new Map<string, DashboardAgentInfo>();

export function registerDashboardAgent(info: Omit<DashboardAgentInfo, 'id' | 'registeredAt' | 'lastHeartbeat'>): string {
  const id = uuidv4();
  const agent: DashboardAgentInfo = {
    id,
    ...info,
    registeredAt: Date.now(),
    lastHeartbeat: Date.now(),
  };
  dashboardAgents.set(id, agent);
  broadcastDashboardAgents();
  logger.info({ id, name: info.name, kind: info.kind }, 'Dashboard agent registered');
  return id;
}

export function updateDashboardAgentStatus(id: string, status: DashboardAgentStatus, detail?: string): void {
  const agent = dashboardAgents.get(id);
  if (!agent) return;
  agent.status = status;
  agent.lastHeartbeat = Date.now();
  if (detail) agent.detail = detail;
  broadcastDashboardAgents();
}

export function heartbeatDashboardAgent(id: string): void {
  const agent = dashboardAgents.get(id);
  if (!agent) return;
  agent.lastHeartbeat = Date.now();
}

export function removeDashboardAgent(id: string): void {
  dashboardAgents.delete(id);
  broadcastDashboardAgents();
}

export function getAllDashboardAgents(): DashboardAgentInfo[] {
  // Clean up stale agents (no heartbeat > 30s)
  const now = Date.now();
  for (const [id, agent] of dashboardAgents) {
    if (now - agent.lastHeartbeat > 30_000 && agent.status === 'running') {
      agent.status = 'completed';
    }
  }
  return Array.from(dashboardAgents.values())
    .sort((a, b) => b.registeredAt - a.registeredAt);
}

function broadcastDashboardAgents(): void {
  const agents = getAllDashboardAgents();
  broadcastEvent({ type: 'dashboard:agents', agents });
}

/**
 * Spawn a sub-agent that's tracked by the dashboard
 */
export function spawnTrackedSubAgent(
  name: string,
  description: string,
  command: string,
  args: string[],
  parentId?: string,
): { id: string } {
  const id = registerDashboardAgent({
    name,
    description,
    kind: parentId ? 'sub-agent' : 'agent',
    status: 'running',
    command,
    parentId,
  });
  return { id };
}
