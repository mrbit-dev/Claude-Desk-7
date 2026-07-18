import { Router, Request, Response } from 'express';
import {
  getAllMCPServers,
  getMCPServer,
  addMCPServer,
  updateMCPServer,
  deleteMCPServer,
  healthCheckMCPServer,
} from '../services/mcp-store.js';
import { discoverTools, callTool, getMCPLogs, clearMCPLogs } from '../services/mcp-tools.js';
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

// GET /api/mcp-servers/:name/tools — discover tools from MCP server
router.get('/:name/tools', async (req: Request, res: Response) => {
  try {
    const { tools, cached } = await discoverTools(req.params.name);
    res.json({ serverName: req.params.name, tools, cached });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to discover MCP tools');
    res.status(500).json({ error: error.message || 'Failed to discover tools' });
  }
});

// POST /api/mcp-servers/:name/tools/:toolName/call — call a tool (playground)
router.post('/:name/tools/:toolName/call', async (req: Request, res: Response) => {
  try {
    const { args } = req.body || {};
    const result = await callTool(req.params.name, req.params.toolName, args || {});
    res.json({ toolName: req.params.toolName, ...result });
  } catch (error: any) {
    logger.error({ error: error.message }, 'Failed to call MCP tool');
    res.status(500).json({ error: error.message || 'Failed to call tool' });
  }
});

// GET /api/mcp-servers/:name/logs — get recent MCP logs
router.get('/:name/logs', (req: Request, res: Response) => {
  try {
    const logs = getMCPLogs(req.params.name);
    res.json({ serverName: req.params.name, logs });
  } catch (error) {
    logger.error({ error }, 'Failed to get MCP logs');
    res.status(500).json({ error: 'Failed to get MCP logs' });
  }
});

// DELETE /api/mcp-servers/:name/logs — clear MCP logs
router.delete('/:name/logs', (req: Request, res: Response) => {
  try {
    clearMCPLogs(req.params.name);
    res.json({ cleared: true });
  } catch (error) {
    logger.error({ error }, 'Failed to clear MCP logs');
    res.status(500).json({ error: 'Failed to clear MCP logs' });
  }
});

export default router;
