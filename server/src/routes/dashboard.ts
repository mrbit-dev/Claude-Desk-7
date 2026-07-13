import { Router, Request, Response } from 'express';
import { readActiveSessions, getAllSessions, readHistory } from '../services/session-store.js';
import { readSettings } from '../services/settings-store.js';
import { getAuthStatus, getClaudeVersion } from '../services/auth-service.js';
import { getAllProjects } from '../services/project-store.js';
import { getCachedAgents } from '../services/agent-monitor.js';
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

    const agents = getCachedAgents();

    res.json({
      activeSessions: activeSessions.length,
      totalSessions: allSessions.length,
      projectsCount: projects.length,
      mcpsHealthy: mcpsTotal,
      mcpsTotal,
      lastActivity,
      claudeVersion: version,
      authStatus: auth.loggedIn ? 'logged_in' : 'logged_out',
      activeAgents: agents.length,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to get dashboard summary');
    res.status(500).json({ error: 'Failed to get dashboard summary' });
  }
});

// GET /api/dashboard/charts — session activity over time
router.get('/charts', (_req: Request, res: Response) => {
  try {
    const allSessions = getAllSessions();
    const history = readHistory();
    const projects = getAllProjects();

    // Sessions per day (last 14 days)
    const now = Date.now();
    const dayMs = 86400000;
    const days: { date: string; sessions: number; agents: number }[] = [];

    const activeAgents = getCachedAgents().length;

    for (let i = 13; i >= 0; i--) {
      const dayStart = now - i * dayMs;
      const dayEnd = dayStart + dayMs;
      const date = new Date(dayStart).toISOString().slice(0, 10);

      const sessionCount = allSessions.filter(s => {
        const t = s.startedAt || 0;
        return t >= dayStart && t < dayEnd;
      }).length;

      days.push({ date, sessions: sessionCount, agents: i === 0 ? activeAgents : 0 });
    }

    // Session distribution by project
    const projectSessions = projects
      .map(p => ({ name: p.slug.split('--').pop() || p.slug, count: p.sessionCount }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    res.json({ days, projectSessions, totalSessions: allSessions.length, totalProjects: projects.length });
  } catch (error) {
    logger.error({ error }, 'Failed to get chart data');
    res.status(500).json({ error: 'Failed to get chart data' });
  }
});

export default router;
