import { utilityProcess, type UtilityProcess } from 'electron';
import fs from 'fs';
import path from 'path';
import { spawn, type ChildProcess } from 'child_process';

export type ManagedDesktopChild = ChildProcess | UtilityProcess;

const ELECTRON_NODE_ENV_KEYS = new Set([
  'ELECTRON_RUN_AS_NODE',
  'ELECTRON_NO_ATTACH_CONSOLE',
  'ELECTRON_FORCE_IS_PACKAGED',
]);

/** Spawning via the Electron binary on macOS registers a second generic Dock icon. */
function resolveNodeSpawnBinary(): string {
  if (process.platform !== 'darwin') {
    return process.execPath;
  }

  const fromEnv = process.env.AIGENIUS_NODE_BINARY?.trim();
  const candidates = [
    fromEnv,
    '/opt/homebrew/bin/node',
    '/usr/local/bin/node',
    '/usr/bin/node',
  ].filter((value): value is string => Boolean(value));

  for (const candidate of candidates) {
    try {
      if (fs.existsSync(candidate)) {
        return candidate;
      }
    } catch {
      /* ignore */
    }
  }

  console.warn(
    '[aigenius-desktop] System Node.js not found; falling back to Electron binary for child process (may show a second Dock icon on macOS). Install Node or set AIGENIUS_NODE_BINARY.',
  );
  return process.execPath;
}

/** Utility processes must not inherit Electron-as-Node flags (causes "bad option: --type=utility"). */
export function sanitizeUtilityProcessEnv(env: NodeJS.ProcessEnv): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [key, value] of Object.entries(env)) {
    if (typeof value !== 'string' || ELECTRON_NODE_ENV_KEYS.has(key)) {
      continue;
    }
    out[key] = value;
  }
  return out;
}

function wireLogStreams(
  child: ManagedDesktopChild,
  stream: fs.WriteStream,
): void {
  if (!child.stdout || !child.stderr) {
    return;
  }
  const endStream = (): void => {
    if (stream.writable) {
      stream.end();
    }
  };
  child.stdout.on('data', (chunk: Buffer | string) => {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    process.stdout.write(buf);
    if (stream.writable) stream.write(buf);
  });
  child.stderr.on('data', (chunk: Buffer | string) => {
    const buf = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
    process.stderr.write(buf);
    if (stream.writable) stream.write(buf);
  });
  if ('killed' in child) {
    child.on('close', endStream);
    return;
  }
  child.on('exit', endStream);
}

function spawnAsNode(
  scriptPath: string,
  opts: { cwd: string; env: NodeJS.ProcessEnv; logPath?: string },
): ChildProcess {
  const env = { ...opts.env };
  const binary = resolveNodeSpawnBinary();
  if (binary === process.execPath) {
    env.ELECTRON_RUN_AS_NODE = '1';
  }

  let stdioConfig: 'inherit' | ['ignore', 'pipe', 'pipe'] = 'inherit';
  let outStream: fs.WriteStream | null = null;
  if (opts.logPath) {
    try {
      outStream = fs.createWriteStream(opts.logPath, { flags: 'a' });
      outStream.on('error', (err) => {
        console.error(`[aigenius-desktop] Log write stream error for ${opts.logPath}:`, err);
      });
      stdioConfig = ['ignore', 'pipe', 'pipe'];
    } catch (err) {
      console.error(`[aigenius-desktop] Failed to create log stream for ${opts.logPath}:`, err);
    }
  }

  const child = spawn(binary, [scriptPath], {
    cwd: opts.cwd,
    env,
    stdio: stdioConfig,
  });

  if (outStream && child.stdout && child.stderr) {
    wireLogStreams(child, outStream);
  }

  return child;
}

function forkUtilityProcess(
  scriptPath: string,
  opts: { cwd: string; env: NodeJS.ProcessEnv; logPath?: string; serviceName: string },
): UtilityProcess {
  const absoluteScript = path.isAbsolute(scriptPath) ? scriptPath : path.resolve(opts.cwd, scriptPath);

  let outStream: fs.WriteStream | null = null;
  let stdio: 'pipe' | 'inherit' = 'inherit';
  if (opts.logPath) {
    try {
      outStream = fs.createWriteStream(opts.logPath, { flags: 'a' });
      outStream.on('error', (err) => {
        console.error(`[aigenius-desktop] Log write stream error for ${opts.logPath}:`, err);
      });
      stdio = 'pipe';
    } catch (err) {
      console.error(`[aigenius-desktop] Failed to create log stream for ${opts.logPath}:`, err);
    }
  }

  const child = utilityProcess.fork(absoluteScript, [], {
    serviceName: opts.serviceName,
    cwd: opts.cwd,
    env: sanitizeUtilityProcessEnv(opts.env),
    stdio,
  });

  if (outStream && child.stdout && child.stderr) {
    wireLogStreams(child, outStream);
  }

  return child;
}

export type SpawnDesktopChildOptions = {
  cwd: string;
  env: NodeJS.ProcessEnv;
  logPath?: string;
  serviceName: string;
  /** When true, keep ELECTRON_RUN_AS_NODE spawn (non-macOS dev fallback). */
  preferNodeSpawn?: boolean;
};

/**
 * Starts mini-server / Next in a Chromium utility process (no extra macOS Dock icon).
 * Falls back to ELECTRON_RUN_AS_NODE spawn when explicitly requested or utility fork fails.
 */
export function spawnDesktopChild(
  scriptPath: string,
  opts: SpawnDesktopChildOptions,
): ManagedDesktopChild {
  const useUtility = !opts.preferNodeSpawn && process.platform === 'darwin';

  if (useUtility) {
    try {
      return forkUtilityProcess(scriptPath, opts);
    } catch (err) {
      console.error(
        `[aigenius-desktop] utilityProcess.fork failed for ${opts.serviceName}:`,
        err,
      );
    }
  }

  if (process.platform === 'darwin') {
    console.warn(
      `[aigenius-desktop] Starting ${opts.serviceName} via Node spawn on macOS (utility process unavailable).`,
    );
  }

  return spawnAsNode(scriptPath, opts);
}

export function killManagedDesktopChild(child: ManagedDesktopChild): void {
  if ('killed' in child) {
    if (!child.killed) {
      child.kill('SIGTERM');
    }
    return;
  }
  child.kill();
}
