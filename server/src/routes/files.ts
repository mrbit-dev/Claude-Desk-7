import { Router, Request, Response } from 'express';
import { readdirSync, existsSync, statSync } from 'fs';
import { join } from 'path';
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

export default router;
