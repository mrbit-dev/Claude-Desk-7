import express from 'express';
import cors from 'cors';
import { createServer } from 'http';
import { resolve } from 'path';
import { existsSync } from 'fs';

import { config } from './config.js';
import { logger } from './utils/logger.js';
import { cleanupOrphans } from './utils/process-manager.js';

// Routes
import dashboardRouter from './routes/dashboard.js';
import sessionsRouter from './routes/sessions.js';
import settingsRouter from './routes/settings.js';
import mcpsRouter from './routes/mcps.js';
import projectsRouter from './routes/projects.js';
import skillsRouter from './routes/skills.js';
import pluginsRouter from './routes/plugins.js';
import authRouter from './routes/auth.js';
import launchRouter from './routes/launch.js';
import agentsRouter from './routes/agents.js';
import logsRouter from './routes/logs.js';
import filesRouter from './routes/files.js';

// WebSocket
import { initWebSocketServer, broadcastEvent } from './websocket/handler.js';
import { startAgentPolling } from './services/agent-monitor.js';
import { watchSettings } from './utils/file-watcher.js';
import { readSettings } from './services/settings-store.js';

const app = express();
const server = createServer(app);

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://localhost:3712'],
  credentials: true,
}));
app.use(express.json({ limit: '5mb' }));

// Request logging
app.use((req, _res, next) => {
  logger.debug({ method: req.method, url: req.url }, 'Request');
  next();
});

// API Routes
app.use('/api/dashboard', dashboardRouter);
app.use('/api/sessions', sessionsRouter);
app.use('/api/settings', settingsRouter);
app.use('/api/mcp-servers', mcpsRouter);
app.use('/api/projects', projectsRouter);
app.use('/api/skills', skillsRouter);
app.use('/api/plugins', pluginsRouter);
app.use('/api/auth', authRouter);
app.use('/api/launch', launchRouter);
app.use('/api/agents', agentsRouter);
app.use('/api/logs', logsRouter);
app.use('/api/files', filesRouter);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: Date.now() });
});

// Serve static files in production
const staticDir = resolve('dist');
if (existsSync(staticDir)) {
  app.use(express.static(staticDir));
  // SPA fallback: serve index.html for all non-API routes
  app.get('*', (_req, res) => {
    res.sendFile(resolve(staticDir, 'index.html'));
  });
}

// Initialize WebSocket
initWebSocketServer(server);
logger.info('WebSocket server initialized on /ws');

// Start agent polling
startAgentPolling();
logger.info('Agent polling started');

// Scan and monitor existing Claude processes
import { scanAndMonitorClaudeProcesses } from './utils/process-manager.js';
scanAndMonitorClaudeProcesses();
logger.info('Claude process monitoring started');

// Watch transcript files for realtime session logs
import { startTranscriptWatcher } from './services/transcript-watcher.js';
startTranscriptWatcher();
logger.info('Transcript watcher started');

// Watch settings.json for external changes
watchSettings(() => {
  const settings = readSettings();
  broadcastEvent({ type: 'settings:changed', settings });
  logger.info('Settings changed externally, broadcast via WS');
});

// Watch sessions directory for new/deleted files
import { watchSessions } from './utils/file-watcher.js';
watchSessions(() => {
  // Sessions are already polled by React Query — we just trigger WS notification
  broadcastEvent({ type: 'session:updated', sessionId: 'all' });
});

// Clean up orphaned processes on start
cleanupOrphans();

// Start server
server.listen(config.port, () => {
  logger.info(`
╔══════════════════════════════════════════════════╗
║            Claude Desk 7 Server                   ║
║──────────────────────────────────────────────────║
║  Open:    http://localhost:${config.port}               ║
║  API:     http://localhost:${config.port}/api         ║
║  WS:      ws://localhost:${config.port}/ws            ║
╚══════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGINT', () => {
  logger.info('Shutting down...');
  cleanupOrphans();
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGTERM', () => {
  logger.info('Shutting down...');
  cleanupOrphans();
  server.close(() => {
    process.exit(0);
  });
});
