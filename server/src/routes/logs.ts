import { Router, Request, Response } from 'express';
import { readLogFiles, subscribeLogs } from '../services/log-service.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/logs
router.get('/', (req: Request, res: Response) => {
  try {
    const lines = parseInt(req.query.lines as string, 10) || 100;
    const logs = readLogFiles(lines);
    res.json(logs);
  } catch (error) {
    logger.error({ error }, 'Failed to read logs');
    res.status(500).json({ error: 'Failed to read logs' });
  }
});

// GET /api/logs/stream — Server-Sent Events endpoint
router.get('/stream', (req: Request, res: Response) => {
  res.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no',
  });

  // Send initial batch of logs
  const initialLogs = readLogFiles(50);
  res.write(`data: ${JSON.stringify({ type: 'initial', lines: initialLogs })}\n\n`);

  // Subscribe to new log lines
  const unsubscribe = subscribeLogs((lines) => {
    for (const line of lines) {
      res.write(`data: ${JSON.stringify({ type: 'line', line })}\n\n`);
    }
  });

  // Keep alive ping every 30s
  const keepAlive = setInterval(() => {
    res.write(': keepalive\n\n');
  }, 30000);

  req.on('close', () => {
    unsubscribe();
    clearInterval(keepAlive);
  });
});

export default router;
