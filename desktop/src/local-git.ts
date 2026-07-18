import { spawn } from 'child_process';
import path from 'path';
import { getActiveCodeProjectRootPath } from './active-code-project';

const MAX_GIT_OUT = 256 * 1024;

function runGit(
  args: string[],
  cwd: string,
): Promise<{ ok: true; stdout: string; stderr: string; code: number } | { ok: false; error: string }> {
  return new Promise((resolve) => {
    const child = spawn('git', args, { cwd, windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d: Buffer) => {
      stdout += d.toString('utf8');
      if (stdout.length > MAX_GIT_OUT) stdout = stdout.slice(0, MAX_GIT_OUT) + '\n…[truncated]';
    });
    child.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString('utf8');
    });
    child.on('error', (err) => {
      resolve({ ok: false, error: err.message });
    });
    child.on('close', (code) => {
      resolve({
        ok: true,
        stdout: stdout.trim(),
        stderr: stderr.trim(),
        code: code ?? 1,
      });
    });
  });
}

function resolveGitCwd(rawCwd: unknown): string {
  if (typeof rawCwd === 'string' && rawCwd.trim()) {
    return path.resolve(rawCwd.trim());
  }
  return getActiveCodeProjectRootPath() ?? process.cwd();
}

export async function runGitStatus(rawArgs: Record<string, unknown>) {
  const cwd = resolveGitCwd(rawArgs.cwd);
  const res = await runGit(['status', '--short', '--branch'], cwd);
  if (!res.ok) return { ok: false as const, error: res.error };
  if (res.code !== 0) {
    return { ok: false as const, error: res.stderr || `git exited ${res.code}` };
  }
  return {
    ok: true as const,
    result: res.stdout || '(clean working tree)',
  };
}

export async function runGitDiff(rawArgs: Record<string, unknown>) {
  const cwd = resolveGitCwd(rawArgs.cwd);
  const staged = rawArgs.staged === true;
  const filePath = typeof rawArgs.path === 'string' ? rawArgs.path.trim() : '';
  const args = ['diff'];
  if (staged) args.push('--cached');
  if (filePath) args.push('--', filePath);
  const res = await runGit(args, cwd);
  if (!res.ok) return { ok: false as const, error: res.error };
  if (res.code !== 0) {
    return { ok: false as const, error: res.stderr || `git exited ${res.code}` };
  }
  return {
    ok: true as const,
    result: res.stdout || '(no diff)',
  };
}
