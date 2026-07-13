import { logger } from '../utils/logger.js';

interface LogLine {
  timestamp: string;
  level: string;
  message: string;
  source?: string;
}

type LogCallback = (lines: LogLine[]) => void;

// In-memory ring buffer để lưu log gần nhất
const ringBuffer: LogLine[] = [];
const MAX_LINES = 500;
const subscribers = new Set<LogCallback>();

/**
 * Ghi log từ server dashboard vào bộ nhớ
 */
export function addServerLog(level: string, message: string, source?: string): void {
  const line: LogLine = {
    timestamp: new Date().toISOString(),
    level: level.toLowerCase(),
    message,
    source: source || 'server',
  };
  ringBuffer.push(line);
  if (ringBuffer.length > MAX_LINES) {
    ringBuffer.splice(0, ringBuffer.length - MAX_LINES);
  }
  // Notify subscribers
  for (const cb of subscribers) {
    cb([line]);
  }
}

/**
 * Read recent logs from ring buffer
 */
export function readLogFiles(linesCount = 100): LogLine[] {
  return ringBuffer.slice(-linesCount);
}

/**
 * Subscribe to real-time log updates
 */
export function subscribeLogs(callback: LogCallback): () => void {
  subscribers.add(callback);
  return () => {
    subscribers.delete(callback);
  };
}

// Tự động ghi log khi server ghi log qua pino
const originalInfo = logger.info.bind(logger) as (...args: any[]) => void;
const originalWarn = logger.warn.bind(logger) as (...args: any[]) => void;
const originalError = logger.error.bind(logger) as (...args: any[]) => void;

logger.info = ((...args: any[]) => {
  originalInfo(...args);
  const msg = args.map((a: any) => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  addServerLog('info', msg);
}) as any;

logger.warn = ((...args: any[]) => {
  originalWarn(...args);
  const msg = args.map((a: any) => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  addServerLog('warn', msg);
}) as any;

logger.error = ((...args: any[]) => {
  originalError(...args);
  const msg = args.map((a: any) => typeof a === 'object' ? JSON.stringify(a) : String(a)).join(' ');
  addServerLog('error', msg);
}) as any;
