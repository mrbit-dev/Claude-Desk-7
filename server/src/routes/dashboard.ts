import { Router, Request, Response } from 'express';
import { readActiveSessions, getAllSessions, readHistory } from '../services/session-store.js';
import { readSettings } from '../services/settings-store.js';
import { getAuthStatus, getClaudeVersion } from '../services/auth-service.js';
import { getAllProjects } from '../services/project-store.js';
import { getCachedAgents } from '../services/agent-monitor.js';
import { logger } from '../utils/logger.js';
import { existsSync, readdirSync, readFileSync } from 'fs';
import { join, parse as parsePath } from 'path';
import { config } from '../config.js';

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

// ---------- Token Usage ----------

interface TokenDay {
  date: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreation: number;
  cacheRead: number;
  sessions: number;
}

interface TokenByModel {
  model: string;
  inputTokens: number;
  outputTokens: number;
  sessions: number;
}

interface TokenUsageResponse {
  daily: TokenDay[];
  byModel: TokenByModel[];
  totals: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
    sessions: number;
  };
  estimatedCost: number;
}

// Cost per million tokens (USD)
const MODEL_RATES: Record<string, { input: number; output: number }> = {
  'claude-opus-4-5': { input: 15, output: 75 },
  'claude-opus-4-8': { input: 15, output: 75 },
  'claude-opus-4': { input: 15, output: 75 },
  'claude-sonnet-4-8': { input: 3, output: 15 },
  'claude-sonnet-4': { input: 3, output: 15 },
  'claude-haiku-4-8': { input: 0.25, output: 1.25 },
  'claude-haiku-4': { input: 0.25, output: 1.25 },
};

function getModelRate(model: string): { input: number; output: number } {
  // Try exact match first
  if (MODEL_RATES[model]) return MODEL_RATES[model];
  // Fall back to partial match
  const lower = model.toLowerCase();
  if (lower.includes('opus')) return { input: 15, output: 75 };
  if (lower.includes('sonnet')) return { input: 3, output: 15 };
  if (lower.includes('haiku')) return { input: 0.25, output: 1.25 };
  // Unknown model — use Sonnet rates as default
  return { input: 3, output: 15 };
}

function estimateCost(model: string, inputTokens: number, outputTokens: number): number {
  const rates = getModelRate(model);
  return (inputTokens / 1_000_000) * rates.input + (outputTokens / 1_000_000) * rates.output;
}

// GET /api/dashboard/token-usage?range=7d|30d|all
router.get('/token-usage', (req: Request, res: Response) => {
  try {
    const range = (req.query.range as string) || '7d';
    const now = Date.now();
    const dayMs = 86400000;
    let cutoff = 0;
    if (range === '7d') cutoff = now - 7 * dayMs;
    else if (range === '30d') cutoff = now - 30 * dayMs;
    // 'all' → no cutoff

    const dailyMap = new Map<string, TokenDay>();
    const modelMap = new Map<string, TokenByModel>();

    const projectsDir = config.claudeProjectsDir;
    if (!existsSync(projectsDir)) {
      res.json({ daily: [], byModel: [], totals: { inputTokens: 0, outputTokens: 0, cacheCreationTokens: 0, cacheReadTokens: 0, sessions: 0 }, estimatedCost: 0 });
      return;
    }

    const slugs = readdirSync(projectsDir, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => d.name);

    for (const slug of slugs) {
      const projectDir = join(projectsDir, slug);
      const files = readdirSync(projectDir).filter(f => f.endsWith('.jsonl'));

      for (const file of files) {
        const sessionId = parsePath(file).name;
        const filePath = join(projectDir, file);

        try {
          const content = readFileSync(filePath, 'utf-8');
          const lines = content.split('\n').filter(Boolean);

          // Track unique sessions seen per day for this file
          // A single JSONL may have multiple assistant turns; we dedupe by day
          const seenDates = new Set<string>();
          let fileInputTokens = 0;
          let fileOutputTokens = 0;
          let fileCacheCreation = 0;
          let fileCacheRead = 0;
          let sessionModel = 'unknown';
          let hasUsage = false;

          for (const line of lines) {
            try {
              const parsed = JSON.parse(line);
              if (parsed.message?.usage) {
                const msg = parsed.message;
                const usage = msg.usage;
                const model = msg.model || 'unknown';
                sessionModel = model;
                hasUsage = true;

                const input = usage.input_tokens || 0;
                const output = usage.output_tokens || 0;
                const cacheCreation = usage.cache_creation_input_tokens || 0;
                const cacheRead = usage.cache_read_input_tokens || 0;

                fileInputTokens += input;
                fileOutputTokens += output;
                fileCacheCreation += cacheCreation;
                fileCacheRead += cacheRead;

                // Determine date from timestamp
                let dateStr = '';
                if (parsed.timestamp) {
                  dateStr = new Date(parsed.timestamp).toISOString().slice(0, 10);
                } else {
                  dateStr = new Date(now).toISOString().slice(0, 10);
                }

                // Apply cutoff
                if (cutoff > 0) {
                  const lineTs = new Date(dateStr).getTime();
                  if (lineTs < cutoff) continue;
                }

                seenDates.add(dateStr);
              }
            } catch { /* skip malformed lines */ }
          }

          if (!hasUsage) continue; // No token data in this file

          // Aggregate into daily buckets (spread session tokens across each day they appear)
          for (const dateStr of seenDates) {
            if (!dailyMap.has(dateStr)) {
              dailyMap.set(dateStr, { date: dateStr, inputTokens: 0, outputTokens: 0, cacheCreation: 0, cacheRead: 0, sessions: 0 });
            }
            const day = dailyMap.get(dateStr)!;
            day.inputTokens += fileInputTokens;
            day.outputTokens += fileOutputTokens;
            day.cacheCreation += fileCacheCreation;
            day.cacheRead += fileCacheRead;
            day.sessions += 1;
          }

          // Aggregate by model
          if (!modelMap.has(sessionModel)) {
            modelMap.set(sessionModel, { model: sessionModel, inputTokens: 0, outputTokens: 0, sessions: 0 });
          }
          const m = modelMap.get(sessionModel)!;
          m.inputTokens += fileInputTokens;
          m.outputTokens += fileOutputTokens;
          m.sessions += 1;
        } catch { /* skip unreadable files */ }
      }
    }

    // Build daily array sorted by date
    const daily = Array.from(dailyMap.values()).sort((a, b) => a.date.localeCompare(b.date));

    // Build byModel array sorted by inputTokens descending
    const byModel = Array.from(modelMap.values()).sort((a, b) => b.inputTokens - a.inputTokens);

    // Compute totals
    const totals = {
      inputTokens: daily.reduce((s, d) => s + d.inputTokens, 0),
      outputTokens: daily.reduce((s, d) => s + d.outputTokens, 0),
      cacheCreationTokens: daily.reduce((s, d) => s + d.cacheCreation, 0),
      cacheReadTokens: daily.reduce((s, d) => s + d.cacheRead, 0),
      sessions: daily.reduce((s, d) => s + d.sessions, 0),
    };

    // Estimated cost: compute per-model then sum
    let estimatedCost = 0;
    for (const m of byModel) {
      estimatedCost += estimateCost(m.model, m.inputTokens, m.outputTokens);
    }

    res.json({ daily, byModel, totals, estimatedCost });
  } catch (error) {
    logger.error({ error }, 'Failed to get token usage data');
    res.status(500).json({ error: 'Failed to get token usage data' });
  }
});

export default router;
