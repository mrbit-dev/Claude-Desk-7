import { Router, Request, Response } from 'express';
import { getActiveAgents, getCachedAgents, getCachedAgentTree, buildAgentTree } from '../services/agent-monitor.js';
import { getAllDashboardAgents } from '../services/dashboard-agent-store.js';
import { config } from '../config.js';
import { join } from 'path';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/agents
router.get('/', (_req: Request, res: Response) => {
  try {
    const agents = getActiveAgents();
    res.json(agents);
  } catch (error) {
    logger.error({ error }, 'Failed to list agents');
    res.status(500).json({ error: 'Failed to list agents' });
  }
});

// GET /api/agents/tree
router.get('/tree', (_req: Request, res: Response) => {
  try {
    const tree = getCachedAgentTree().length > 0 ? getCachedAgentTree() : buildAgentTree();
    res.json(tree);
  } catch (error) {
    logger.error({ error }, 'Failed to get agent tree');
    res.status(500).json({ error: 'Failed to get agent tree' });
  }
});

// GET /api/agents/cached
router.get('/cached', (_req: Request, res: Response) => {
  res.json(getCachedAgents());
});

// GET /api/agents/all — merged list of Claude agents + dashboard-tracked agents
router.get('/all', (_req: Request, res: Response) => {
  try {
    const claudeAgents = getActiveAgents();
    const dashboardAgents = getAllDashboardAgents();
    res.json({
      claude: claudeAgents,
      dashboard: dashboardAgents,
      total: claudeAgents.length + dashboardAgents.length,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to list all agents');
    res.status(500).json({ error: 'Failed to list all agents' });
  }
});

// GET /api/agents/dashboard — just dashboard-tracked agents
router.get('/dashboard', (_req: Request, res: Response) => {
  try {
    res.json(getAllDashboardAgents());
  } catch (error) {
    logger.error({ error }, 'Failed to list dashboard agents');
    res.status(500).json({ error: 'Failed to list dashboard agents' });
  }
});

// POST /api/agents/register — register a dashboard-tracked agent
router.post('/register', async (req: Request, res: Response) => {
  try {
    const { registerDashboardAgent } = await import('../services/dashboard-agent-store.js');
    const { name, description, kind, parentId } = req.body || {};
    const id = registerDashboardAgent({
      name: name || 'Unnamed Agent',
      description: description || '',
      kind: kind || 'sub-agent',
      status: 'running',
      parentId,
    });
    res.status(201).json({ id, registered: true });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to register agent');
    res.status(500).json({ error: error.message || 'Failed to register agent' });
  }
});

// POST /api/agents/:id/heartbeat — keep agent alive
router.post('/:id/heartbeat', async (req: Request, res: Response) => {
  try {
    const { heartbeatDashboardAgent } = await import('../services/dashboard-agent-store.js');
    heartbeatDashboardAgent(req.params.id);
    res.json({ ok: true });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Heartbeat failed');
    res.status(500).json({ error: 'Heartbeat failed' });
  }
});

// POST /api/agents/:id/status — update agent status
router.post('/:id/status', async (req: Request, res: Response) => {
  try {
    const { updateDashboardAgentStatus } = await import('../services/dashboard-agent-store.js');
    const { status, detail } = req.body || {};
    updateDashboardAgentStatus(req.params.id, status || 'running', detail);
    res.json({ ok: true });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Status update failed');
    res.status(500).json({ error: 'Status update failed' });
  }
});

export default router;
