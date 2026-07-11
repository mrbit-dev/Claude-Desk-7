import { format, formatDistanceToNow } from 'date-fns';

export function formatTimestamp(ms: number): string {
  return format(new Date(ms), 'MMM d, yyyy HH:mm');
}

export function formatRelativeTime(ms: number): string {
  return formatDistanceToNow(new Date(ms), { addSuffix: true });
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

export function truncateSessionId(id: string): string {
  return id.slice(0, 8) + '...';
}

export function maskToken(token?: string): string {
  if (!token) return '';
  if (token.length < 12) return '***';
  return token.slice(0, 8) + '...' + token.slice(-3);
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${Math.round(ms / 1000)}s`;
  const minutes = Math.floor(ms / 60000);
  const seconds = Math.round((ms % 60000) / 1000);
  return `${minutes}m ${seconds}s`;
}
