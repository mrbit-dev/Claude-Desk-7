import { watch, FSWatcher } from 'chokidar';
import { config } from '../config.js';

type FileChangeCallback = (path: string) => void;

const watchers = new Map<string, FSWatcher>();
const callbacks = new Map<string, Set<FileChangeCallback>>();

/**
 * Watch a file for changes
 */
export function watchFile(filePath: string, callback: FileChangeCallback): void {
  if (!callbacks.has(filePath)) {
    callbacks.set(filePath, new Set());
  }
  callbacks.get(filePath)!.add(callback);

  if (!watchers.has(filePath)) {
    const watcher = watch(filePath, {
      persistent: true,
      ignoreInitial: true,
      awaitWriteFinish: { stabilityThreshold: 200, pollInterval: 100 },
    });

    watcher.on('change', (changedPath) => {
      const cbs = callbacks.get(filePath);
      if (cbs) {
        for (const cb of cbs) cb(changedPath);
      }
    });

    watchers.set(filePath, watcher);
  }
}

/**
 * Watch settings.json for external changes
 */
export function watchSettings(callback: FileChangeCallback): void {
  watchFile(config.claudeSettingsFile, callback);
}

/**
 * Watch sessions directory for new/deleted session files
 */
export function watchSessions(callback: FileChangeCallback): void {
  watchFile(config.claudeSessionsDir, callback);
}

/**
 * Remove a callback for a file
 */
export function unwatchFile(filePath: string, callback: FileChangeCallback): void {
  const cbs = callbacks.get(filePath);
  if (cbs) {
    cbs.delete(callback);
    if (cbs.size === 0) {
      const watcher = watchers.get(filePath);
      if (watcher) {
        watcher.close();
        watchers.delete(filePath);
      }
      callbacks.delete(filePath);
    }
  }
}

/**
 * Stop all watchers
 */
export function stopAllWatchers(): void {
  for (const [, watcher] of watchers) {
    watcher.close();
  }
  watchers.clear();
  callbacks.clear();
}
