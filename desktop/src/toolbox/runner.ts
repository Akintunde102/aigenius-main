import { spawn } from 'child_process';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';
import { StringDecoder } from 'string_decoder';
import type { ToolboxRuntime } from './types';
import { killChildProcessTree } from '../utils/shell-process-tree';
import { resolveWindowsExecutable } from '../utils/resolve-windows-executable';

const MAX_OUTPUT_BYTES = 100 * 1024;

const ENV_ALLOWLIST = new Set([
  'PATH',
  'PATHEXT',
  'SystemRoot',
  'WINDIR',
  'COMSPEC',
  'TEMP',
  'TMP',
  'HOME',
  'USERPROFILE',
  'HOMEDRIVE',
  'HOMEPATH',
  'APPDATA',
  'LOCALAPPDATA',
  'PROGRAMFILES',
  'PROGRAMFILES(X86)',
  'PROCESSOR_ARCHITECTURE',
  'PROCESSOR_ARCHITEW6432',
  'LANG',
  'LC_ALL',
  'LC_CTYPE',
  'SHELL',
  'TERM',
  'TOOLBOX_WORK_DIR',
]);

export function buildToolEnv(workDir: string): Record<string, string> {
  const out: Record<string, string> = { TOOLBOX_WORK_DIR: workDir };
  for (const key of Object.keys(process.env)) {
    if (!ENV_ALLOWLIST.has(key)) {
      continue;
    }
    const val = process.env[key];
    if (typeof val === 'string') {
      out[key] = val;
    }
  }
  return out;
}

function capOutput(buf: string): string {
  if (Buffer.byteLength(buf, 'utf8') <= MAX_OUTPUT_BYTES) {
    return buf;
  }
  const b = Buffer.from(buf, 'utf8').subarray(0, MAX_OUTPUT_BYTES);
  return b.toString('utf8') + '\n… (output truncated at 100 KB)';
}

function findExecutableInPath(name: string): string | null {
  const pathEnv = process.env.PATH || '';
  const exts = process.platform === 'win32' ? (process.env.PATHEXT || '.EXE;.CMD;.BAT').split(';') : [''];
  const dirs = pathEnv.split(path.delimiter);
  for (const dir of dirs) {
    for (const ext of exts) {
      const full = path.join(dir, name + (name.toLowerCase().endsWith(ext.toLowerCase()) ? '' : ext));
      try {
        if (fsSync.existsSync(full)) {
          return full;
        }
      } catch {
        /* ignore */
      }
    }
  }
  return null;
}

async function resolvePythonExecutable(userDataDir: string): Promise<string | null> {
  const bundled = path.join(
    userDataDir,
    'python-venv',
    process.platform === 'win32' ? path.join('Scripts', 'python.exe') : path.join('bin', 'python'),
  );
  try {
    await fs.access(bundled);
    return bundled;
  } catch {
    /* try system candidates */
  }

  const candidates =
    process.platform === 'win32'
      ? ['py', 'python', 'python3']
      : ['python3', 'python'];

  for (const c of candidates) {
    if (findExecutableInPath(c)) {
      return c;
    }
  }
  return null;
}

export type RunProcessParams = {
  runtime: ToolboxRuntime;
  entryPath: string;
  workDir: string;
  args: string[];
  timeoutMs: number;
  userDataDir: string;
};

export async function runProcess(params: RunProcessParams): Promise<
  | { ok: true; exitCode: number; stdout: string; stderr: string }
  | { ok: false; error: string; code?: string }
> {
  const env = buildToolEnv(params.workDir);
  let cmd: string;
  let cmdArgs: string[];

  switch (params.runtime) {
    case 'node':
      cmd = process.execPath;
      cmdArgs = [params.entryPath, ...params.args];
      env.ELECTRON_RUN_AS_NODE = '1';
      break;
    case 'python': {
      const py = await resolvePythonExecutable(params.userDataDir);
      if (!py) {
        return { ok: false, error: 'Python runtime not found on this machine', code: 'runtime_missing' };
      }
      if (py === 'py') {
        cmd = 'py';
        cmdArgs = ['-3', params.entryPath, ...params.args];
      } else {
        cmd = py;
        cmdArgs = [params.entryPath, ...params.args];
      }
      break;
    }
    case 'powershell':
      cmd = resolveWindowsExecutable('powershell.exe');
      cmdArgs = ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', params.entryPath, ...params.args];
      break;
    case 'bash':
      cmd = process.platform === 'win32' ? 'bash.exe' : '/bin/bash';
      cmdArgs = [params.entryPath, ...params.args];
      break;
    default:
      return { ok: false, error: `unsupported runtime: ${params.runtime}` };
  }

  return new Promise((resolve) => {
    const child = spawn(cmd, cmdArgs, {
      cwd: params.workDir,
      env: { ...env },
      windowsHide: true,
    });

    const outDec = new StringDecoder('utf8');
    const errDec = new StringDecoder('utf8');
    let stdout = '';
    let stderr = '';
    let killed = false;

    const timer = setTimeout(() => {
      killed = true;
      killChildProcessTree(child);
    }, params.timeoutMs);

    child.stdout?.on('data', (chunk) => {
      stdout += outDec.write(chunk);
    });
    child.stderr?.on('data', (chunk) => {
      stderr += errDec.write(chunk);
    });

    child.on('error', (err) => {
      clearTimeout(timer);
      resolve({ ok: false, error: err.message });
    });

    child.on('close', (code) => {
      clearTimeout(timer);
      stdout += outDec.end();
      stderr += errDec.end();
      if (killed) {
        resolve({
          ok: true,
          exitCode: code ?? 1,
          stdout: capOutput(stdout),
          stderr: capOutput(stderr + '\n(process killed: timeout)'),
        });
        return;
      }
      resolve({
        ok: true,
        exitCode: code ?? 0,
        stdout: capOutput(stdout),
        stderr: capOutput(stderr),
      });
    });
  });
}
