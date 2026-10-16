import type { ChildProcess } from 'child_process';
import { StringDecoder } from 'string_decoder';
import { killChildProcessTree } from './utils/shell-process-tree';

export interface TrackedProcess {
  pid: number;
  command: string;
  cwd: string;
  startedAt: number;
  endedAt?: number;
  status: 'running' | 'exited' | 'crashed' | 'killed';
  exitCode: number | null;
  stdoutLines: string[];
  stderrLines: string[];
  child: ChildProcess;
}

const MAX_RING_BUFFER_LINES = 500;
const PRUNE_RETENTION_MS = 15 * 60 * 1000; // 15 minutes

class ProcessRegistry {
  private processes = new Map<number, TrackedProcess>();

  register(
    child: ChildProcess,
    command: string,
    cwd: string,
    initialStdout = '',
    initialStderr = '',
  ): TrackedProcess {
    const pid = child.pid;
    if (!pid) {
      throw new Error('Cannot register process without PID');
    }

    this.pruneOldProcesses();

    const stdoutLines = initialStdout
      ? initialStdout.split(/\r?\n/).slice(-MAX_RING_BUFFER_LINES)
      : [];
    const stderrLines = initialStderr
      ? initialStderr.split(/\r?\n/).slice(-MAX_RING_BUFFER_LINES)
      : [];

    const tracked: TrackedProcess = {
      pid,
      command,
      cwd,
      startedAt: Date.now(),
      status: 'running',
      exitCode: null,
      stdoutLines,
      stderrLines,
      child,
    };

    const decOut = new StringDecoder('utf8');
    const decErr = new StringDecoder('utf8');

    child.stdout?.on('data', (buf: Buffer) => {
      const text = decOut.write(buf);
      if (text) {
        const lines = text.split(/\r?\n/);
        for (const line of lines) {
          if (line) {
            tracked.stdoutLines.push(line);
            if (tracked.stdoutLines.length > MAX_RING_BUFFER_LINES) {
              tracked.stdoutLines.shift();
            }
          }
        }
      }
    });

    child.stderr?.on('data', (buf: Buffer) => {
      const text = decErr.write(buf);
      if (text) {
        const lines = text.split(/\r?\n/);
        for (const line of lines) {
          if (line) {
            tracked.stderrLines.push(line);
            if (tracked.stderrLines.length > MAX_RING_BUFFER_LINES) {
              tracked.stderrLines.shift();
            }
          }
        }
      }
    });

    let hasExited = false;
    const onExit = (code: number | null) => {
      if (hasExited || tracked.status === 'killed') {
        return;
      }
      hasExited = true;
      tracked.endedAt = Date.now();
      tracked.exitCode = code;
      tracked.status = code === 0 ? 'exited' : 'crashed';
    };

    child.once('exit', onExit);
    child.once('close', onExit);
    child.on('error', (err) => {
      tracked.endedAt = Date.now();
      tracked.status = 'crashed';
      tracked.stderrLines.push(`Process error: ${err.message}`);
    });

    this.processes.set(pid, tracked);
    return tracked;
  }

  get(pid: number): TrackedProcess | undefined {
    return this.processes.get(pid);
  }

  list(): Array<{
    pid: number;
    command: string;
    cwd: string;
    status: TrackedProcess['status'];
    uptime_seconds: number;
    exit_code: number | null;
    started_at: string;
  }> {
    this.pruneOldProcesses();
    const now = Date.now();
    return Array.from(this.processes.values()).map((p) => {
      const end = p.endedAt ?? now;
      return {
        pid: p.pid,
        command: p.command,
        cwd: p.cwd,
        status: p.status,
        uptime_seconds: Math.round((end - p.startedAt) / 1000),
        exit_code: p.exitCode,
        started_at: new Date(p.startedAt).toISOString(),
      };
    });
  }

  getLogs(
    pid: number,
    tailLines = 50,
  ): {
    ok: true;
    pid: number;
    status: TrackedProcess['status'];
    stdout: string;
    stderr: string;
    exit_code: number | null;
  } | { ok: false; error: string } {
    const proc = this.processes.get(pid);
    if (!proc) {
      return { ok: false, error: `Process with PID ${pid} not found in registry.` };
    }

    const n = Math.max(1, Math.min(tailLines, MAX_RING_BUFFER_LINES));
    const stdout = proc.stdoutLines.slice(-n).join('\n');
    const stderr = proc.stderrLines.slice(-n).join('\n');

    return {
      ok: true,
      pid: proc.pid,
      status: proc.status,
      stdout,
      stderr,
      exit_code: proc.exitCode,
    };
  }

  kill(pid: number): { ok: true; pid: number; message: string } | { ok: false; error: string } {
    const proc = this.processes.get(pid);
    if (!proc) {
      return { ok: false, error: `Process with PID ${pid} not found in registry.` };
    }

    if (proc.status === 'exited' || proc.status === 'crashed' || proc.status === 'killed') {
      return {
        ok: true,
        pid,
        message: `Process ${pid} is already ${proc.status} (exit code ${proc.exitCode ?? 'none'}).`,
      };
    }

    try {
      killChildProcessTree(proc.child);
      proc.status = 'killed';
      proc.endedAt = Date.now();
      return {
        ok: true,
        pid,
        message: `Successfully terminated process ${pid} and all child processes. Port(s) released.`,
      };
    } catch (e) {
      return {
        ok: false,
        error: `Failed to terminate process ${pid}: ${e instanceof Error ? e.message : String(e)}`,
      };
    }
  }

  terminateAll(): void {
    for (const proc of this.processes.values()) {
      if (proc.status === 'running') {
        try {
          killChildProcessTree(proc.child);
          proc.status = 'killed';
          proc.endedAt = Date.now();
        } catch {
          /* best-effort */
        }
      }
    }
  }

  private pruneOldProcesses(): void {
    const now = Date.now();
    for (const [pid, proc] of this.processes.entries()) {
      if (proc.status !== 'running' && proc.endedAt && now - proc.endedAt > PRUNE_RETENTION_MS) {
        this.processes.delete(pid);
      }
    }
  }

  /** For tests only */
  clear(): void {
    this.processes.clear();
  }
}

export const processRegistry = new ProcessRegistry();
