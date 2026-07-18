import type { ChatTurn } from '../types/claude.js';

const MAX_CONTEXT_CHARS = 80_000;

interface BuildContextOptions {
  initialPrompt?: string;
  previousTurns: { prompt: string; responseLines: string[] }[];
  newPrompt: string;
}

/**
 * Build a context prompt from conversation history for claude --print.
 * Includes system instruction, history, and new prompt.
 */
export function buildContextPrompt(options: BuildContextOptions): string {
  const { initialPrompt, previousTurns, newPrompt } = options;

  const parts: string[] = ['You are continuing a conversation.'];

  if (initialPrompt) {
    parts.push(`\n## Original Request\n${initialPrompt}\n`);
  }

  if (previousTurns.length > 0) {
    const historyLines: string[] = ['\n## Conversation History\n'];
    for (const turn of previousTurns) {
      historyLines.push(`**User:** ${turn.prompt}`);
      if (turn.responseLines.length > 0) {
        const response = turn.responseLines.join('\n');
        const truncated = response.length > 2000 ? response.slice(0, 2000) + '\n... [truncated]' : response;
        historyLines.push(`**Claude:** ${truncated}`);
      }
      historyLines.push('---');
    }
    parts.push(historyLines.join('\n'));
  }

  parts.push(`\n## Current Question\n${newPrompt}\n`);

  parts.push('\nPlease respond to the current question above, taking into account the conversation history.');

  let context = parts.join('\n\n');

  // Truncate if too long
  if (context.length > MAX_CONTEXT_CHARS) {
    const trimmed = previousTurns.slice(-3);
    const retryParts = ['You are continuing a conversation. The oldest parts have been truncated due to length.\n'];
    if (initialPrompt) retryParts.push(`\n## Original Request\n${initialPrompt}\n`);

    const historyLines: string[] = ['\n## Recent Conversation History\n'];
    for (const turn of trimmed) {
      historyLines.push(`**User:** ${turn.prompt.slice(0, 500)}`);
      const response = turn.responseLines.join('\n');
      historyLines.push(`**Claude:** ${response.slice(0, 500)}`);
      historyLines.push('---');
    }
    retryParts.push(historyLines.join('\n'));
    retryParts.push(`\n## Current Question\n${newPrompt}\n`);
    context = retryParts.join('\n\n');

    if (context.length > MAX_CONTEXT_CHARS) {
      context = context.slice(0, MAX_CONTEXT_CHARS) + '\n\n... [context truncated due to length]';
    }
  }

  return context;
}

/**
 * Parse the response from claude --print into lines.
 */
export function parsePrintResponse(text: string): string[] {
  return text
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
}
