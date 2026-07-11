import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { spawnClaudeProcess, killClaudeProcess, getRunningProcesses } from '../utils/process-manager.js';
import { broadcastEvent } from '../websocket/handler.js';
import { logger } from '../utils/logger.js';

const router = Router();

// POST /api/launch
router.post('/', (req: Request, res: Response) => {
  try {
    const { prompt, model, effort, cwd } = req.body;

    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }
    if (prompt.length > 100000) {
      return res.status(400).json({ error: 'Prompt too long (max 100k chars)' });
    }

    const sessionId = uuidv4();

    const child = spawnClaudeProcess(prompt, sessionId, {
      model,
      effort,
      cwd,
    });

    const pid = child.pid || 0;

    // Stream stdout to WebSocket
    child.stdout?.on('data', (data: Buffer) => {
      const text = data.toString('utf-8');
      broadcastEvent({
        type: 'launch:output',
        sessionId,
        text,
        stream: 'stdout',
      });
    });

    child.stderr?.on('data', (data: Buffer) => {
      const text = data.toString('utf-8');
      broadcastEvent({
        type: 'launch:output',
        sessionId,
        text,
        stream: 'stderr',
      });
    });

    child.on('error', (err) => {
      broadcastEvent({
        type: 'launch:error',
        sessionId,
        error: err.message,
      });
    });

    const startTime = Date.now();
    child.on('exit', (exitCode) => {
      const duration = Date.now() - startTime;
      broadcastEvent({
        type: 'launch:done',
        sessionId,
        exitCode,
        duration,
      });
    });

    logger.info({ sessionId, pid, prompt: prompt.slice(0, 100) }, 'Session launched');

    res.status(201).json({ sessionId, pid });
  } catch (error) {
    logger.error({ error }, 'Failed to launch session');
    res.status(500).json({ error: 'Failed to launch session' });
  }
});

// POST /api/launch/:sessionId/cancel
router.post('/:sessionId/cancel', (req: Request, res: Response) => {
  const { sessionId } = req.params;
  const killed = killClaudeProcess(sessionId);
  res.json({ cancelled: killed, sessionId });
});

// GET /api/launch/active
router.get('/active', (_req: Request, res: Response) => {
  const processes = getRunningProcesses();
  res.json(processes);
});

export default router;
