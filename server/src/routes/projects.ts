import { Router, Request, Response } from 'express';
import { getAllProjects, getProjectDetail, purgeProject } from '../services/project-store.js';
import { getGitInfo } from '../services/git-service.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/projects
router.get('/', (_req: Request, res: Response) => {
  try {
    const projects = getAllProjects();
    res.json(projects);
  } catch (error) {
    logger.error({ error }, 'Failed to list projects');
    res.status(500).json({ error: 'Failed to list projects' });
  }
});

// GET /api/projects/:slug/git-info
router.get('/:slug/git-info', (req: Request, res: Response) => {
  try {
    const gitInfo = getGitInfo(req.params.slug);
    if (!gitInfo) return res.status(404).json({ error: 'Git info not available' });
    res.json(gitInfo);
  } catch (error) {
    logger.error({ error }, 'Failed to get git info');
    res.status(500).json({ error: 'Failed to get git info' });
  }
});

// GET /api/projects/:slug
router.get('/:slug', (req: Request, res: Response) => {
  try {
    const project = getProjectDetail(req.params.slug);
    if (!project) return res.status(404).json({ error: 'Project not found' });
    res.json(project);
  } catch (error) {
    logger.error({ error }, 'Failed to get project');
    res.status(500).json({ error: 'Failed to get project' });
  }
});

// DELETE /api/projects/:slug
router.delete('/:slug', (req: Request, res: Response) => {
  try {
    const purgeSessions = req.query.purgeSessions === 'true';
    const result = purgeProject(req.params.slug, purgeSessions);
    if (!result.success) {
      return res.status(404).json({ error: 'Project not found or could not be purged' });
    }
    res.json({ deleted: true, sessionsRemoved: result.sessionsRemoved });
  } catch (error) {
    logger.error({ error }, 'Failed to purge project');
    res.status(500).json({ error: 'Failed to purge project' });
  }
});

export default router;
