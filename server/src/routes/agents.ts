import { Router, Request, Response } from 'express';
import { getActiveAgents, getCachedAgents, getCachedAgentTree, buildAgentTree } from '../services/agent-monitor.js';
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

export default router;
