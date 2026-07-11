import { Router, Request, Response } from 'express';
import { readActiveSessions, getAllSessions, readHistory } from '../services/session-store.js';
import { readSettings } from '../services/settings-store.js';
import { getAuthStatus, getClaudeVersion } from '../services/auth-service.js';
import { getAllProjects } from '../services/project-store.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/dashboard/summary
router.get('/summary', (_req: Request, res: Response) => {
  try {
    const activeSessions = readActiveSessions();
    const allSessions = getAllSessions();
    const projects = getAllProjects();
    const settings = readSettings();
    const auth = getAuthStatus();
    const version = getClaudeVersion();

    // Count MCPs
    const mcpsTotal = settings.mcpServers ? Object.keys(settings.mcpServers).length : 0;

    // Last activity
    const history = readHistory();
    const lastActivity = history.length > 0
      ? history[history.length - 1].timestamp
      : null;

    res.json({
      activeSessions: activeSessions.length,
      totalSessions: allSessions.length,
      projectsCount: projects.length,
      mcpsHealthy: mcpsTotal, // We don't run health checks here, assume configured
      mcpsTotal,
      lastActivity,
      claudeVersion: version,
      authStatus: auth.loggedIn ? 'logged_in' : 'logged_out',
      activeAgents: 0, // Populated by agent monitor
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get dashboard summary');
    res.status(500).json({ error: 'Failed to get dashboard summary' });
  }
});

export default router;
