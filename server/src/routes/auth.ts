import { Router, Request, Response } from 'express';
import { getAuthStatus } from '../services/auth-service.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/auth/status
router.get('/status', (_req: Request, res: Response) => {
  try {
    const status = getAuthStatus();
    res.json(status);
  } catch (error) {
    logger.error({ error }, 'Failed to get auth status');
    res.status(500).json({ error: 'Failed to get auth status' });
  }
});

export default router;
