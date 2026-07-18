import { Router, Request, Response } from 'express';
import { getAllSkills, getSkill, createSkill, getSkillContent, updateSkillContent } from '../services/skills-store.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/skills
router.get('/', (_req: Request, res: Response) => {
  try {
    const skills = getAllSkills();
    res.json(skills);
  } catch (error) {
    logger.error({ error }, 'Failed to list skills');
    res.status(500).json({ error: 'Failed to list skills' });
  }
});

// GET /api/skills/:name/content
router.get('/:name/content', (req: Request, res: Response) => {
  try {
    const content = getSkillContent(req.params.name);
    if (content === null) return res.status(404).json({ error: 'Skill or SKILL.md not found' });
    res.json({ name: req.params.name, content });
  } catch (error) {
    logger.error({ error }, 'Failed to get skill content');
    res.status(500).json({ error: 'Failed to get skill content' });
  }
});

// PUT /api/skills/:name/content
router.put('/:name/content', (req: Request, res: Response) => {
  try {
    const { content } = req.body;
    if (typeof content !== 'string') {
      return res.status(400).json({ error: 'Content is required as a string' });
    }
    const success = updateSkillContent(req.params.name, content);
    if (!success) return res.status(404).json({ error: 'Skill not found' });
    res.json({ name: req.params.name, content });
  } catch (error) {
    logger.error({ error }, 'Failed to update skill content');
    res.status(500).json({ error: 'Failed to update skill content' });
  }
});

// GET /api/skills/:name
router.get('/:name', (req: Request, res: Response) => {
  try {
    const skill = getSkill(req.params.name);
    if (!skill) return res.status(404).json({ error: 'Skill not found' });
    res.json(skill);
  } catch (error) {
    logger.error({ error }, 'Failed to get skill');
    res.status(500).json({ error: 'Failed to get skill' });
  }
});

// POST /api/skills — create a new skill
router.post('/', (req: Request, res: Response) => {
  try {
    const { name, description, triggers, model } = req.body;
    if (!name || !description) {
      return res.status(400).json({ error: 'Name and description are required' });
    }
    // Validate name (alphanumeric + hyphens)
    if (!/^[a-z0-9-]+$/.test(name)) {
      return res.status(400).json({ error: 'Name must be lowercase alphanumeric with hyphens only' });
    }
    const skill = createSkill({ name, description, triggers, model });
    res.status(201).json(skill);
  } catch (error) {
    logger.error({ error }, 'Failed to create skill');
    res.status(500).json({ error: 'Failed to create skill' });
  }
});

export default router;
