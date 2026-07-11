import { Router, Request, Response } from 'express';
import { readSettings, writeSettings, mergeSettings } from '../services/settings-store.js';
import { ClaudeSettings } from '../types/claude.js';

const router = Router();

// GET /api/settings
router.get('/', (_req: Request, res: Response) => {
  try {
    const settings = readSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to read settings' });
  }
});

// PUT /api/settings
router.put('/', (req: Request, res: Response) => {
  try {
    const partial = req.body as Partial<ClaudeSettings>;
    const merged = mergeSettings(partial);
    const saved = writeSettings(merged);
    res.json(saved);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

export default router;
