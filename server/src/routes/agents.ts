import { Router, Request, Response } from 'express';
import { getActiveAgents, getCachedAgents, getCachedAgentTree, buildAgentTree } from '../services/agent-monitor.js';
import { getAllDashboardAgents } from '../services/dashboard-agent-store.js';
import { buildUnifiedTree, getAgentTranscript, getAgentLogs } from '../services/unified-agent.js';
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

// GET /api/agents/all — merged list
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

// GET /api/agents/unified — unified tree (Claude + Dashboard merged)
router.get('/unified', (_req: Request, res: Response) => {
  try {
    const roots = buildUnifiedTree();
    res.json(roots);
  } catch (error) {
    logger.error({ error }, 'Failed to build unified tree');
    res.status(500).json({ error: 'Failed to build unified tree' });
  }
});

// GET /api/agents/transcript/:sessionId — live transcript for mini viewer
router.get('/transcript/:sessionId', (req: Request, res: Response) => {
  try {
    const limit = parseInt(req.query.limit as string) || 20;
    const lines = getAgentTranscript(req.params.sessionId, limit);
    res.json({ sessionId: req.params.sessionId, lines, count: lines.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get agent transcript');
    res.status(500).json({ error: 'Failed to get agent transcript' });
  }
});

// GET /api/agents/logs/:sessionId — agent logs
router.get('/logs/:sessionId', (req: Request, res: Response) => {
  try {
    const logs = getAgentLogs(req.params.sessionId);
    res.json({ sessionId: req.params.sessionId, logs });
  } catch (error) {
    logger.error({ error }, 'Failed to get agent logs');
    res.status(500).json({ error: 'Failed to get agent logs' });
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

// POST /api/agents/:id/heartbeat
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

// POST /api/agents/:id/status
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
