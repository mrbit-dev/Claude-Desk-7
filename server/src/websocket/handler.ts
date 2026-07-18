import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { WSEvent, WSClientMessage } from '../types/claude.js';
import { sendProcessInput, killClaudeProcess } from '../utils/process-manager.js';
import { logger } from '../utils/logger.js';

interface ClientState {
  subscriptions: Set<string>;
  ws: WebSocket;
}

let wss: WebSocketServer | null = null;
const clients = new Map<WebSocket, ClientState>();

// Event emitters for other modules to broadcast
type EventHandler = (event: WSEvent) => void;
const eventHandlers = new Map<string, Set<EventHandler>>();

/**
 * Initialize WebSocket server
 */
export function initWebSocketServer(server: Server): WebSocketServer {
  wss = new WebSocketServer({ server, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    const state: ClientState = {
      subscriptions: new Set(),
      ws,
    };
    clients.set(ws, state);

    logger.info('WebSocket client connected');

    ws.on('message', (raw) => {
      try {
        const msg = JSON.parse(raw.toString()) as WSClientMessage;
        handleClientMessage(ws, state, msg);
      } catch (error) {
        logger.warn({ error }, 'Invalid WebSocket message');
      }
    });

    ws.on('close', () => {
      clients.delete(ws);
      logger.info('WebSocket client disconnected');
    });

    ws.on('error', (error) => {
      logger.error({ error }, 'WebSocket error');
      clients.delete(ws);
    });
  });

  return wss;
}

/**
 * Handle incoming client messages
 */
function handleClientMessage(ws: WebSocket, state: ClientState, msg: WSClientMessage): void {
  switch (msg.type) {
    case 'subscribe:launch':
      state.subscriptions.add(`launch:${msg.sessionId}`);
      logger.debug({ sessionId: msg.sessionId }, 'Client subscribed to launch');
      break;

    case 'subscribe:agent-watch':
      state.subscriptions.add('agent:watch');
      break;

    case 'subscribe:logs':
      state.subscriptions.add('logs');
      break;

    case 'subscribe:mcp-logs':
      state.subscriptions.add(`mcp-logs:${msg.serverName}`);
      break;

    case 'launch:input':
      sendProcessInput(msg.sessionId, msg.text);
      break;

    case 'launch:cancel':
      killClaudeProcess(msg.sessionId);
      break;

    case 'chat:input':
      sendProcessInput(msg.sessionId, msg.text);
      break;

    case 'chat:cancel':
      killClaudeProcess(msg.sessionId);
      break;
  }
}

/**
 * Broadcast an event to all subscribed clients
 */
export function broadcastEvent(event: WSEvent): void {
  // Notify event handlers (for internal modules)
  const handlers = eventHandlers.get(event.type);
  if (handlers) {
    for (const handler of handlers) {
      handler(event);
    }
  }

  // Broadcast to WebSocket clients
  for (const [, state] of clients) {
    switch (event.type) {
      case 'launch:output':
      case 'launch:done':
      case 'launch:error':
        if (state.subscriptions.has(`launch:${event.sessionId}`)) {
          sendSafe(state.ws, event);
        }
        break;

      case 'agent:update':
        if (state.subscriptions.has('agent:watch')) {
          sendSafe(state.ws, event);
        }
        break;

      case 'dashboard:agents':
        if (state.subscriptions.has('agent:watch')) {
          sendSafe(state.ws, event);
        }
        break;

      case 'agents:sync':
        if (state.subscriptions.has('agent:watch')) {
          sendSafe(state.ws, event);
        }
        break;

      case 'settings:changed':
        sendSafe(state.ws, event);
        break;

      case 'session:created':
      case 'session:deleted':
        sendSafe(state.ws, event);
        break;

      case 'mcp:log':
        if (state.subscriptions.has(`mcp-logs:${event.serverName}`)) {
          sendSafe(state.ws, event);
        }
        break;
    }
  }
}

/**
 * Subscribe to internal events
 */
export function onEvent(type: string, handler: EventHandler): void {
  if (!eventHandlers.has(type)) {
    eventHandlers.set(type, new Set());
  }
  eventHandlers.get(type)!.add(handler);
}

/**
 * Send a message safely (catch errors)
 */
function sendSafe(ws: WebSocket, data: unknown): void {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(data));
    }
  } catch { /* ignore */ }
}

/**
 * Get number of connected clients
 */
export function getClientCount(): number {
  return clients.size;
}
