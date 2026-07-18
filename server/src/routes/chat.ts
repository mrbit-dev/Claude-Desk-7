import { Router, Request, Response } from 'express';
import { spawn } from 'child_process';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import { sendProcessInput, getRunningProcesses } from '../utils/process-manager.js';
import { broadcastEvent } from '../websocket/handler.js';
import {
  createChatSession,
  listChatSessions,
  getChatSession,
  deleteChatSession,
  addTurn,
  completeTurn,
  updateTurnTranscript,
} from '../services/chat-store.js';
import { buildContextPrompt, parsePrintResponse } from '../utils/context-builder.js';
import type { TranscriptLine } from '../types/claude.js';

const router = Router();

// POST /api/chat/sessions — create a new chat session
router.post('/sessions', (req: Request, res: Response) => {
  try {
    const { cwd, model, effort, initialPrompt } = req.body || {};
    const session = createChatSession(cwd, initialPrompt);

    // If there's an initial prompt, start the first turn
    if (initialPrompt) {
      const result = addTurn(session.sessionId, initialPrompt);
      if (result) {
        // Don't block — start the turn async
        startTurnProcess(session.sessionId, result.turn.turnId, initialPrompt, cwd, model, effort, initialPrompt);
        return res.status(201).json({
          sessionId: session.sessionId,
          session,
          turnId: result.turn.turnId,
          title: session.title,
        });
      }
    }

    res.status(201).json({ sessionId: session.sessionId, session, title: session.title });
  } catch (error) {
    logger.error({ error }, 'Failed to create chat session');
    res.status(500).json({ error: 'Failed to create chat session' });
  }
});

// GET /api/chat/sessions — list all chat sessions
router.get('/sessions', (_req: Request, res: Response) => {
  try {
    const sessions = listChatSessions();
    res.json(sessions);
  } catch (error) {
    logger.error({ error }, 'Failed to list chat sessions');
    res.status(500).json({ error: 'Failed to list chat sessions' });
  }
});

// GET /api/chat/sessions/:id — get a chat session with turns
router.get('/sessions/:id', (req: Request, res: Response) => {
  try {
    const session = getChatSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Chat session not found' });
    res.json(session);
  } catch (error) {
    logger.error({ error }, 'Failed to get chat session');
    res.status(500).json({ error: 'Failed to get chat session' });
  }
});

// DELETE /api/chat/sessions/:id — delete a chat session
router.delete('/sessions/:id', (req: Request, res: Response) => {
  try {
    const deleted = deleteChatSession(req.params.id);
    if (!deleted) return res.status(404).json({ error: 'Chat session not found' });
    res.json({ deleted: true });
  } catch (error) {
    logger.error({ error }, 'Failed to delete chat session');
    res.status(500).json({ error: 'Failed to delete chat session' });
  }
});

// POST /api/chat/sessions/:id/turn — start a new turn
router.post('/sessions/:id/turn', (req: Request, res: Response) => {
  try {
    const { text, model, effort } = req.body || {};
    if (!text || typeof text !== 'string') {
      return res.status(400).json({ error: 'Text is required' });
    }

    const session = getChatSession(req.params.id);
    if (!session) return res.status(404).json({ error: 'Chat session not found' });

    const result = addTurn(session.sessionId, text);
    if (!result) return res.status(500).json({ error: 'Failed to add turn' });

    // Build context and start process (async)
    const previousTurns = session.turns
      .filter(t => t.turnId !== result.turn.turnId && t.completedAt)
      .map(t => ({
        prompt: t.prompt,
        responseLines: [] as string[], // We don't store full response text — only transcript path
      }));

    const context = buildContextPrompt({
      initialPrompt: session.turns[0]?.prompt,
      previousTurns,
      newPrompt: text,
    });

    // Start in background
    startTurnProcess(session.sessionId, result.turn.turnId, context, session.slug, model, effort, text);

    res.status(201).json({
      sessionId: session.sessionId,
      turnId: result.turn.turnId,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to start turn');
    res.status(500).json({ error: 'Failed to start turn' });
  }
});

/**
 * Internal: spawn claude --print for a turn, broadcast output via WS
 */
function startTurnProcess(
  sessionId: string,
  turnId: string,
  prompt: string,
  cwd?: string,
  model?: string,
  effort?: string,
  originalPrompt?: string,
) {
  const args: string[] = [];

  if (model) args.push('--model', model);
  if (effort) args.push('--effort', effort);

  args.push('--print', prompt, '--output-format', 'json');

  logger.info({ sessionId, turnId }, 'Starting chat turn');

  const child = spawn(config.claudeExeShell, args, {
    cwd: cwd || process.cwd(),
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
    env: {
      ...process.env,
      CLAUDE_CODE_LOG_LEVEL: 'error',
      NO_COLOR: '1',
    },
  });

  const allLines: string[] = [];
  let parsedTranscript = false;

  child.stdout?.on('data', (chunk: Buffer) => {
    const text = chunk.toString('utf-8');
    // Try to parse JSONL lines
    const lines = text.split('\n').filter(Boolean);
    for (const line of lines) {
      try {
        const parsed: TranscriptLine = JSON.parse(line);
        allLines.push(line);
        parsedTranscript = true;
        broadcastEvent({
          type: 'chat:output',
          sessionId,
          turnId,
          line: parsed,
        });
      } catch {
        // Not JSON — probably plain text output
        allLines.push(line);
        broadcastEvent({
          type: 'chat:output',
          sessionId,
          turnId,
          line: { type: 'assistant', uuid: uuidv4(), parentUuid: null, timestamp: new Date().toISOString(), sessionId, message: { role: 'assistant', content: [{ type: 'text' as const, text: line }] } },
        });
      }
    }
  });

  child.stderr?.on('data', (chunk: Buffer) => {
    const text = chunk.toString('utf-8');
    broadcastEvent({
      type: 'chat:output',
      sessionId,
      turnId,
      line: { type: 'assistant', uuid: uuidv4(), parentUuid: null, timestamp: new Date().toISOString(), sessionId, message: { role: 'assistant', content: [{ type: 'text' as const, text: `[stderr] ${text}` }] } },
    });
  });

  child.on('error', (err: Error) => {
    logger.error({ error: err.message, sessionId, turnId }, 'Chat turn error');
    broadcastEvent({ type: 'chat:error', sessionId, turnId, error: err.message });
    completeTurn(sessionId, turnId, null);
  });

  child.on('exit', (code) => {
    const duration = Date.now() - (getChatSession(sessionId)?.turns.find(t => t.turnId === turnId)?.startedAt || Date.now());
    logger.info({ sessionId, turnId, code, duration }, 'Chat turn completed');

    // Save transcript if we got JSONL output
    if (allLines.length > 0 && parsedTranscript) {
      const transcriptDir = join(config.claudeDir, 'projects', sessionId);
      try {
        if (!existsSync(transcriptDir)) mkdirSync(transcriptDir, { recursive: true });
        const transcriptPath = join(transcriptDir, `${turnId}.jsonl`);
        writeFileSync(transcriptPath, allLines.join('\n'), 'utf-8');
        updateTurnTranscript(sessionId, turnId, transcriptPath);
      } catch (err) {
        logger.error({ error: err }, 'Failed to save transcript');
      }
    }

    completeTurn(sessionId, turnId, code, duration);

    broadcastEvent({ type: 'chat:done', sessionId, turnId, exitCode: code, duration });
  });
}

// Need imports for the above
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join } from 'path';

export default router;
