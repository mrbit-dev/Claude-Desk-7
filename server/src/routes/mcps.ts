import { Router, Request, Response } from 'express';
import {
  getAllMCPServers,
  getMCPServer,
  addMCPServer,
  updateMCPServer,
  deleteMCPServer,
  healthCheckMCPServer,
} from '../services/mcp-store.js';
import { MCPServerWithName } from '../types/claude.js';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/mcp-servers
router.get('/', (_req: Request, res: Response) => {
  try {
    const servers = getAllMCPServers();
    res.json(servers);
  } catch (error) {
    logger.error({ error }, 'Failed to list MCP servers');
    res.status(500).json({ error: 'Failed to list MCP servers' });
  }
});

// GET /api/mcp-servers/:name
router.get('/:name', (req: Request, res: Response) => {
  try {
    const server = getMCPServer(req.params.name);
    if (!server) return res.status(404).json({ error: 'MCP server not found' });
    res.json(server);
  } catch (error) {
    logger.error({ error }, 'Failed to get MCP server');
    res.status(500).json({ error: 'Failed to get MCP server' });
  }
});

// POST /api/mcp-servers
router.post('/', (req: Request, res: Response) => {
  try {
    const server = req.body as MCPServerWithName;
    if (!server.name || !server.command) {
      return res.status(400).json({ error: 'Name and command are required' });
    }
    const created = addMCPServer(server);
    res.status(201).json(created);
  } catch (error) {
    logger.error({ error }, 'Failed to add MCP server');
    res.status(500).json({ error: 'Failed to add MCP server' });
  }
});

// PUT /api/mcp-servers/:name
router.put('/:name', (req: Request, res: Response) => {
  try {
    const updates = req.body as Partial<MCPServerWithName>;
    const updated = updateMCPServer(req.params.name, updates);
    if (!updated) return res.status(404).json({ error: 'MCP server not found' });
    res.json(updated);
  } catch (error) {
    logger.error({ error }, 'Failed to update MCP server');
    res.status(500).json({ error: 'Failed to update MCP server' });
  }
});

// DELETE /api/mcp-servers/:name
router.delete('/:name', (req: Request, res: Response) => {
  try {
    const deleted = deleteMCPServer(req.params.name);
    if (!deleted) return res.status(404).json({ error: 'MCP server not found' });
    res.json({ deleted: true, name: req.params.name });
  } catch (error) {
    logger.error({ error }, 'Failed to delete MCP server');
    res.status(500).json({ error: 'Failed to delete MCP server' });
  }
});

// POST /api/mcp-servers/:name/health-check
router.post('/:name/health-check', async (req: Request, res: Response) => {
  try {
    const result = await healthCheckMCPServer(req.params.name);
    res.json({ name: req.params.name, ...result });
  } catch (error) {
    logger.error({ error }, 'Health check failed');
    res.status(500).json({ error: 'Health check failed' });
  }
});

export default router;
