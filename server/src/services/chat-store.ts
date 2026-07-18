import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import { join } from 'path';
import { v4 as uuidv4 } from 'uuid';
import { config } from '../config.js';
import { logger } from '../utils/logger.js';
import type { ChatSession, ChatTurn, Usage } from '../types/claude.js';

const CHATS_FILE = join(config.claudeDir, 'desk-chats.json');

interface PersistedData {
  sessions: ChatSession[];
}

function readChats(): PersistedData {
  try {
    if (!existsSync(CHATS_FILE)) return { sessions: [] };
    const raw = readFileSync(CHATS_FILE, 'utf-8');
    return JSON.parse(raw);
  } catch (error) {
    logger.error({ error }, 'Failed to read chat data');
    return { sessions: [] };
  }
}

function writeChats(data: PersistedData): void {
  try {
    const dir = config.claudeDir;
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    writeFileSync(CHATS_FILE, JSON.stringify(data, null, 2), 'utf-8');
  } catch (error) {
    logger.error({ error }, 'Failed to write chat data');
  }
}

export function createChatSession(cwd?: string, initialPrompt?: string): ChatSession {
  const data = readChats();
  const now = Date.now();
  const session: ChatSession = {
    sessionId: uuidv4(),
    title: initialPrompt ? initialPrompt.slice(0, 60) : 'New Chat',
    slug: cwd
      ? cwd.replace(/\\/g, '/').toLowerCase().replace(/[^a-z0-9/]/g, '-').replace(/[/]/g, '--')
      : 'chat',
    turns: [],
    createdAt: now,
    updatedAt: now,
  };
  data.sessions.push(session);
  writeChats(data);
  logger.info({ sessionId: session.sessionId }, 'Chat session created');
  return session;
}

export function listChatSessions(): ChatSession[] {
  const data = readChats();
  return data.sessions.sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getChatSession(sessionId: string): ChatSession | null {
  const data = readChats();
  return data.sessions.find(s => s.sessionId === sessionId) || null;
}

export function deleteChatSession(sessionId: string): boolean {
  const data = readChats();
  const idx = data.sessions.findIndex(s => s.sessionId === sessionId);
  if (idx === -1) return false;
  data.sessions.splice(idx, 1);
  writeChats(data);
  logger.info({ sessionId }, 'Chat session deleted');
  return true;
}

export function addTurn(sessionId: string, prompt: string): { session: ChatSession; turn: ChatTurn } | null {
  const data = readChats();
  const session = data.sessions.find(s => s.sessionId === sessionId);
  if (!session) return null;

  const turn: ChatTurn = {
    turnId: uuidv4(),
    prompt,
    startedAt: Date.now(),
  };
  session.turns.push(turn);
  session.updatedAt = Date.now();
  writeChats(data);
  return { session, turn };
}

export function completeTurn(
  sessionId: string,
  turnId: string,
  exitCode: number | null,
  duration?: number,
  tokenUsage?: Usage
): void {
  const data = readChats();
  const session = data.sessions.find(s => s.sessionId === sessionId);
  if (!session) return;
  const turn = session.turns.find(t => t.turnId === turnId);
  if (!turn) return;
  turn.completedAt = Date.now();
  turn.exitCode = exitCode;
  if (tokenUsage) {
    (turn as any).tokenUsage = tokenUsage;
  }
  session.updatedAt = Date.now();
  // Auto-update title from first turn if still default
  if (session.turns.length === 1 && session.title === 'New Chat') {
      const firstPrompt = session.turns[0]?.prompt;
      if (firstPrompt && typeof firstPrompt === 'string') session.title = firstPrompt.slice(0, 60);
  }
  writeChats(data);
}

export function updateTurnTranscript(sessionId: string, turnId: string, transcriptPath: string): void {
  const data = readChats();
  const session = data.sessions.find(s => s.sessionId === sessionId);
  if (!session) return;
  const turn = session.turns.find(t => t.turnId === turnId);
  if (!turn) return;
  turn.transcriptPath = transcriptPath;
  writeChats(data);
}
