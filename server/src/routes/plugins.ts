import { Router, Request, Response } from 'express';
import { listInstalledPlugins, getMarketplacePlugins, installPlugin, uninstallPlugin } from '../services/plugin-store.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/plugins
router.get('/', (_req: Request, res: Response) => {
  try {
    const installed = listInstalledPlugins();
    res.json(installed);
  } catch (error) {
    logger.error({ error }, 'Failed to list plugins');
    res.status(500).json({ error: 'Failed to list plugins' });
  }
});

// GET /api/plugins/marketplace
router.get('/marketplace', (_req: Request, res: Response) => {
  try {
    const plugins = getMarketplacePlugins();
    res.json(plugins);
  } catch (error) {
    logger.error({ error }, 'Failed to get marketplace');
    res.status(500).json({ error: 'Failed to get marketplace' });
  }
});

// POST /api/plugins/:name/install
router.post('/:name/install', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const result = await installPlugin(name);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    logger.error({ error }, 'Failed to install plugin');
    res.status(500).json({ success: false, message: 'Failed to install plugin' });
  }
});

// POST /api/plugins/:name/uninstall
router.post('/:name/uninstall', async (req: Request, res: Response) => {
  try {
    const { name } = req.params;
    const result = await uninstallPlugin(name);
    if (result.success) {
      res.json(result);
    } else {
      res.status(500).json(result);
    }
  } catch (error) {
    logger.error({ error }, 'Failed to uninstall plugin');
    res.status(500).json({ success: false, message: 'Failed to uninstall plugin' });
  }
});

export default router;
