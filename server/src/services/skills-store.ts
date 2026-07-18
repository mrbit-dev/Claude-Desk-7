import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import { config } from '../config.js';
import { readSettings, writeSettings } from './settings-store.js';
import { logger } from '../utils/logger.js';

interface SkillInfo {
  name: string;
  description: string;
  path: string;
  hasSkillMd: boolean;
  hasClaudeMd: boolean;
  model?: string;
}

/**
 * List all installed custom skills from ~/.claude/skills/
 */
export function getAllSkills(): SkillInfo[] {
  const skills: SkillInfo[] = [];

  try {
    if (!existsSync(config.claudeSkillsDir)) return skills;

    const entries = readdirSync(config.claudeSkillsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const name of entries) {
      const skillDir = join(config.claudeSkillsDir, name);
      const skillMdPath = join(skillDir, 'SKILL.md');
      const claudeMdPath = join(skillDir, 'CLAUDE.md');

      // Try to read description from SKILL.md first line
      let description = '';
      if (existsSync(skillMdPath)) {
        const content = readFileSync(skillMdPath, 'utf-8');
        const firstLine = content.split('\n')[0]?.trim();
        if (firstLine) description = firstLine.replace(/^#\s*/, '');
      }

      skills.push({
        name,
        description: description || 'No description',
        path: skillDir,
        hasSkillMd: existsSync(skillMdPath),
        hasClaudeMd: existsSync(claudeMdPath),
      });
    }
  } catch (error) {
    logger.error({ error }, 'Failed to read skills');
  }

  return skills;
}

/**
 * Get details for a specific skill
 */
export function getSkill(name: string): SkillInfo | null {
  const skills = getAllSkills();
  return skills.find(s => s.name === name) || null;
}

interface CreateSkillInput {
  name: string;
  description: string;
  triggers?: string[];
  model?: string;
}

/**
 * Create a new skill: create directory, SKILL.md, and register in settings
 */
export function createSkill(input: CreateSkillInput): SkillInfo {
  const { name, description, triggers, model } = input;

  // Create skill directory
  const skillDir = join(config.claudeSkillsDir, name);
  mkdirSync(skillDir, { recursive: true });

  // Write SKILL.md
  const skillMdContent = `# ${description}\n\nThis skill is managed by Claude Code Dashboard.\n`;
  writeFileSync(join(skillDir, 'SKILL.md'), skillMdContent, 'utf-8');

  // Write CLAUDE.md with usage instructions
  const claudeMdContent = `# ${name} Skill\n\n${description}\n\n## Usage\n\nDescribe how to use this skill here.\n`;
  writeFileSync(join(skillDir, 'CLAUDE.md'), claudeMdContent, 'utf-8');

  // Register in settings.json
  try {
    const settings = readSettings();
    if (!settings.skills) settings.skills = {};
    settings.skills[name] = {
      name,
      description,
      systemPromptPath: `skills/${name}/SKILL.md`,
      ...(triggers && triggers.length > 0 ? { triggers } : {}),
      ...(model ? { model } : {}),
    };
    writeSettings(settings);
    logger.info({ name }, 'Skill created and registered in settings');
  } catch (error) {
    logger.warn({ error }, 'Could not register skill in settings (settings may need manual update)');
  }

  return {
    name,
    description,
    path: skillDir,
    hasSkillMd: true,
    hasClaudeMd: true,
    model,
  };
}

/**
 * Read the SKILL.md content for a specific skill
 */
export function getSkillContent(name: string): string | null {
  const skillDir = join(config.claudeSkillsDir, name);
  const skillMdPath = join(skillDir, 'SKILL.md');

  try {
    if (!existsSync(skillMdPath)) return null;
    return readFileSync(skillMdPath, 'utf-8');
  } catch (error) {
    logger.error({ error, name }, 'Failed to read SKILL.md');
    return null;
  }
}

/**
 * Write content to a skill's SKILL.md file
 */
export function updateSkillContent(name: string, content: string): boolean {
  const skillDir = join(config.claudeSkillsDir, name);

  try {
    if (!existsSync(skillDir)) return false;
    mkdirSync(skillDir, { recursive: true });
    writeFileSync(join(skillDir, 'SKILL.md'), content, 'utf-8');
    logger.info({ name }, 'SKILL.md updated');
    return true;
  } catch (error) {
    logger.error({ error, name }, 'Failed to update SKILL.md');
    return false;
  }
}
