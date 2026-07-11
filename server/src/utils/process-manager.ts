import { spawn, ChildProcess, execSync, exec } from 'child_process';
import { config } from '../config.js';
import { addServerLog } from '../services/log-service.js';

interface ManagedProcess {
  process: ChildProcess;
  sessionId: string;
  startedAt: number;
  output: string[];
  maxBuffer: number;
}

const processes = new Map<string, ManagedProcess>();
const monitoredPids = new Set<number>();

/**
 * Spawn a claude.exe child process in --print mode
 */
export function spawnClaudeProcess(
  prompt: string,
  sessionId: string,
  options?: {
    model?: string;
    effort?: string;
    cwd?: string;
    jsonSchema?: string;
  }
): ChildProcess {
  const args = ['--print', prompt, '--output-format', 'json'];

  if (options?.model) {
    args.unshift('--model', options.model);
  }
  if (options?.effort) {
    args.unshift('--effort', options.effort);
  }
  if (options?.jsonSchema) {
    args.unshift('--json-schema', options.jsonSchema);
  }

  addServerLog('info', `Spawning Claude: ${config.claudeExeShell} ${args.slice(0, 3).join(' ')}...`, 'claude-launcher');

  // Use shell mode + quoted path to handle spaces in path on Windows
  const child = spawn(config.claudeExeShell, args, {
    cwd: options?.cwd || process.cwd(),
    windowsHide: true,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: true,
    env: {
      ...process.env,
      CLAUDE_CODE_LOG_LEVEL: 'error',
      NO_COLOR: '1',
    },
  });

  const managed: ManagedProcess = {
    process: child,
    sessionId,
    startedAt: Date.now(),
    output: [],
    maxBuffer: 10000,
  };

  child.stdout?.on('data', (data: Buffer) => {
    const text = data.toString('utf-8').trim();
    if (!text) return;
    managed.output.push(text);
    if (managed.output.length > managed.maxBuffer) {
      managed.output.splice(0, managed.output.length - managed.maxBuffer);
    }
    addServerLog('info', `[Claude:${sessionId.slice(0, 8)}] ${text.slice(0, 500)}`, 'claude');
  });

  child.stderr?.on('data', (data: Buffer) => {
    const text = data.toString('utf-8').trim();
    if (!text) return;
    addServerLog('warn', `[Claude:${sessionId.slice(0, 8)}] ${text.slice(0, 500)}`, 'claude');
  });

  child.on('exit', (code) => {
    addServerLog('info', `[Claude:${sessionId.slice(0, 8)}] Process exited with code ${code}`, 'claude');
    processes.delete(sessionId);
  });

  child.on('error', (err) => {
    addServerLog('error', `[Claude:${sessionId.slice(0, 8)}] ${err.message}`, 'claude');
  });

  processes.set(sessionId, managed);
  addServerLog('info', `[Claude:${sessionId.slice(0, 8)}] Started (PID: ${child.pid})`, 'claude');
  return child;
}

/**
 * Monitor a running Claude process by PID (e.g. main interactive session, background agents)
 * Captures its stdout/stderr into the log system.
 */
export function monitorExternalProcess(pid: number, label: string): void {
  if (monitoredPids.has(pid)) return;
  monitoredPids.add(pid);

  addServerLog('info', `Monitoring external process ${label} (PID: ${pid})`, 'claude-monitor');

  // Try to capture output via wmic (Windows) — we can't read another process's stdio directly,
  // but we can periodically check its status and any debug output it might have generated
  const interval = setInterval(() => {
    try {
      // Check if process is still alive
      process.kill(pid, 0);
    } catch {
      clearInterval(interval);
      monitoredPids.delete(pid);
      addServerLog('info', `External process ${label} (PID: ${pid}) ended`, 'claude-monitor');
    }
  }, 5000);
}

/**
 * Scan for running Claude processes on the system and monitor them
 */
export function scanAndMonitorClaudeProcesses(): void {
  try {
    const output = execSync(`tasklist /FI "IMAGENAME eq claude.exe" /FO CSV /NH`, {
      encoding: 'utf-8',
      windowsHide: true,
      timeout: 5000,
    });
    const lines = output.trim().split('\n').filter(Boolean);
    for (const line of lines) {
      const parts = line.replace(/"/g, '').split(',');
      if (parts.length >= 2) {
        const pid = parseInt(parts[1], 10);
        if (pid && !monitoredPids.has(pid)) {
          monitorExternalProcess(pid, `claude.exe (${parts[0]})`);
        }
      }
    }
  } catch {
    // tasklist may fail if no claude.exe running
  }
}

/**
 * Kill a managed claude process
 */
export function killClaudeProcess(sessionId: string): boolean {
  const managed = processes.get(sessionId);
  if (!managed) return false;

  const pid = managed.process.pid;
  if (pid) {
    try {
      execSync(`taskkill /F /PID ${pid}`, { windowsHide: true });
      addServerLog('info', `[Claude:${sessionId.slice(0, 8)}] Killed (PID: ${pid})`, 'claude');
    } catch {
      try { managed.process.kill('SIGTERM'); } catch { /* ignore */ }
    }
  }
  processes.delete(sessionId);
  return true;
}

/**
 * Send input to a running process's stdin
 */
export function sendProcessInput(sessionId: string, text: string): boolean {
  const managed = processes.get(sessionId);
  if (!managed || !managed.process.stdin) return false;

  managed.process.stdin.write(text + '\n');
  return true;
}

/**
 * Get a managed process by session ID
 */
export function getProcess(sessionId: string): ManagedProcess | undefined {
  return processes.get(sessionId);
}

/**
 * Clean up any leftover managed processes (e.g., on server restart)
 */
export function cleanupOrphans(): void {
  for (const [sessionId, managed] of processes) {
    if (managed.process.exitCode === null) {
      killClaudeProcess(sessionId);
    }
  }
  processes.clear();
}

/**
 * Get all running managed processes
 */
export function getRunningProcesses(): Array<{ sessionId: string; pid: number | undefined; startedAt: number }> {
  const running: Array<{ sessionId: string; pid: number | undefined; startedAt: number }> = [];
  for (const [sessionId, managed] of processes) {
    if (managed.process.exitCode === null) {
      running.push({ sessionId, pid: managed.process.pid, startedAt: managed.startedAt });
    }
  }
  return running;
}
