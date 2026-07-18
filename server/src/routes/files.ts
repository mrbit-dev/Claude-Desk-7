import { Router, Request, Response } from 'express';
import { readdirSync, existsSync, statSync } from 'fs';
import { resolve } from 'path';
import { join } from 'path';
import { execFile } from 'child_process';
import { platform } from 'os';
import { logger } from '../utils/logger.js';

const router = Router();

// GET /api/files/browse?path=E:\
// Trả về danh sách thư mục con tại path đó
router.get('/browse', (req: Request, res: Response) => {
  try {
    const dirPath = req.query.path as string || '';

    // Nếu không có path, trả về danh sách ổ đĩa
    if (!dirPath) {
      const drives = getWindowsDrives();
      return res.json({ path: '', parent: null, entries: drives, isDrive: true });
    }

    if (!existsSync(dirPath)) {
      return res.status(404).json({ error: 'Path not found' });
    }

    const stats = statSync(dirPath);
    if (!stats.isDirectory()) {
      return res.status(400).json({ error: 'Not a directory' });
    }

    // Đọc danh sách thư mục con
    const entries = readdirSync(dirPath, { withFileTypes: true })
      .filter(d => d.isDirectory())
      .map(d => ({
        name: d.name,
        path: join(dirPath, d.name),
      }))
      .sort((a, b) => a.name.toLowerCase().localeCompare(b.name.toLowerCase()));

    // Tính parent path
    const parent = getParentPath(dirPath);

    res.json({
      path: dirPath,
      parent,
      entries,
      isDrive: false,
    });
  } catch (error) {
    logger.error({ error }, 'Failed to browse directory');
    res.status(500).json({ error: 'Failed to browse directory' });
  }
});

/**
 * Lấy danh sách ổ đĩa trên Windows
 */
function getWindowsDrives(): Array<{ name: string; path: string }> {
  const drives: Array<{ name: string; path: string }> = [];
  for (let i = 65; i <= 90; i++) { // A: to Z:
    const letter = String.fromCharCode(i);
    const drivePath = `${letter}:\\`;
    try {
      if (existsSync(drivePath)) {
        drives.push({ name: `Ổ ${letter}`, path: drivePath });
      }
    } catch { /* skip */ }
  }
  return drives;
}

/**
 * Lấy thư mục cha từ path
 */
function getParentPath(dirPath: string): string | null {
  const normalized = dirPath.replace(/\\/g, '/');
  const lastSlash = normalized.lastIndexOf('/');
  if (lastSlash <= 0) return null; // root drive
  const parent = normalized.substring(0, lastSlash);
  if (parent.endsWith(':')) return parent + '\\'; // convert C: back to C:\
  return parent.replace(/\//g, '\\');
}

/**
 * POST /api/files/open
 * Mở file/folder trong Windows Explorer (hoặc Finder trên macOS, file manager trên Linux)
 */
router.post('/open', (req: Request, res: Response) => {
  try {
    const { path } = req.body;
    if (!path || typeof path !== 'string') {
      return res.status(400).json({ error: 'Path is required' });
    }

    const resolvedPath = resolve(path);
    if (!existsSync(resolvedPath)) {
      return res.status(404).json({ error: 'Path not found' });
    }

    const os = platform();
    if (os === 'win32') {
      // Windows: mở Explorer và highlight file/folder
      execFile('explorer.exe', ['/select,', resolvedPath]);
    } else if (os === 'darwin') {
      // macOS: mở Finder
      execFile('open', [resolvedPath]);
    } else {
      // Linux: mở file manager mặc định
      execFile('xdg-open', [resolvedPath]);
    }

    logger.info({ path: resolvedPath }, 'Opened path in file manager');
    res.json({ opened: true, path: resolvedPath });
  } catch (error) {
    logger.error({ error }, 'Failed to open path');
    res.status(500).json({ error: 'Failed to open path' });
  }
});

export default router;
