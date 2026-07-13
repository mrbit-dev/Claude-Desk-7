import { Router, Request, Response } from 'express';
import { getAllSessions, readTranscript, isPidAlive, getTranscriptCount, searchAllSessions } from '../services/session-store.js';
import { killClaudeProcess } from '../utils/process-manager.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/sessions
router.get('/', (_req: Request, res: Response) => {
  try {
    const sessions = getAllSessions();
    res.json(sessions);
  } catch (error) {
    logger.error({ error }, 'Failed to list sessions');
    res.status(500).json({ error: 'Failed to list sessions' });
  }
});

// GET /api/sessions/search?q=keyword — MUST be before /:id
router.get('/search', (req: Request, res: Response) => {
  try {
    const query = (req.query.q as string || '').trim();
    if (!query) return res.json({ results: [], total: 0 });

    const results = searchAllSessions(query);
    res.json({ results, total: results.length });
  } catch (error) {
    logger.error({ error }, 'Search failed');
    res.status(500).json({ error: 'Search failed' });
  }
});

// GET /api/sessions/:id
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const sessions = getAllSessions();
    const session = sessions.find(s => s.sessionId === id);
    if (!session) {
      return res.status(404).json({ error: 'Session not found' });
    }
    res.json(session);
  } catch (error) {
    logger.error({ error }, 'Failed to get session');
    res.status(500).json({ error: 'Failed to get session' });
  }
});

// DELETE /api/sessions/:id
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // Kill process if running
    killClaudeProcess(id);
    res.json({ deleted: true, sessionId: id });
  } catch (error) {
    logger.error({ error }, 'Failed to delete session');
    res.status(500).json({ error: 'Failed to delete session' });
  }
});

// POST /api/sessions/:id/stop
router.post('/:id/stop', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const killed = killClaudeProcess(id);
    res.json({ stopped: killed, sessionId: id });
  } catch (error) {
    logger.error({ error }, 'Failed to stop session');
    res.status(500).json({ error: 'Failed to stop session' });
  }
});

// GET /api/sessions/:id/transcript
router.get('/:id/transcript', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const limit = req.query.limit ? parseInt(req.query.limit as string, 10) : undefined;
    const offset = req.query.offset ? parseInt(req.query.offset as string, 10) : undefined;

    const lines = readTranscript(id, { limit, offset });
    const total = getTranscriptCount(id);

    res.json({
      sessionId: id,
      total,
      returned: lines.length,
      offset: offset || 0,
      lines,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to read transcript');
    res.status(500).json({ error: 'Failed to read transcript' });
  }
});

export default router;
