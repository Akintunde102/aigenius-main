import { spawn } from 'child_process';
import path from 'path';
import { getActiveCodeProjectRootPath } from './active-code-project';

const MAX_RG_OUT = 200 * 1024;
const DEFAULT_LIMIT = 40;

function resolveSearchRoot(raw: Record<string, unknown>): string {
  if (typeof raw.path_prefix === 'string' && raw.path_prefix.trim()) {
    return path.resolve(raw.path_prefix.trim());
  }
  if (typeof raw.cwd === 'string' && raw.cwd.trim()) {
    return path.resolve(raw.cwd.trim());
  }
  return getActiveCodeProjectRootPath() ?? process.cwd();
}

export async function runFindReferences(
  rawArgs: Record<string, unknown>,
): Promise<{ ok: true; result: string } | { ok: false; error: string }> {
  const symbol = typeof rawArgs.symbol === 'string' ? rawArgs.symbol.trim() : '';
  if (!symbol) {
    return { ok: false, error: 'symbol is required' };
  }
  const root = resolveSearchRoot(rawArgs);
  const limit = typeof rawArgs.limit === 'number' ? Math.min(rawArgs.limit, 100) : DEFAULT_LIMIT;
  const extensions = Array.isArray(rawArgs.extensions)
    ? rawArgs.extensions.filter((e): e is string => typeof e === 'string')
    : ['ts', 'tsx', 'js', 'jsx', 'py', 'go', 'rs'];

  const globArgs = extensions.flatMap((ext) => ['-g', `*.${ext.replace(/^\./, '')}`]);

  return new Promise((resolve) => {
    const args = [
      '--no-heading',
      '--line-number',
      '--color=never',
      '-w',
      ...globArgs,
      symbol,
      root,
    ];
    const child = spawn('rg', args, { windowsHide: true });
    let stdout = '';
    let stderr = '';
    child.stdout?.on('data', (d: Buffer) => {
      stdout += d.toString('utf8');
      if (stdout.length > MAX_RG_OUT) {
        child.kill();
      }
    });
    child.stderr?.on('data', (d: Buffer) => {
      stderr += d.toString('utf8');
    });
    child.on('error', () => {
      resolve({
        ok: false,
        error: 'ripgrep (rg) not found on PATH — install ripgrep for reference search',
      });
    });
    child.on('close', (code) => {
      if (code !== 0 && !stdout.trim()) {
        resolve({
          ok: true,
          result: `No references found for "${symbol}" under ${root}`,
        });
        return;
      }
      const lines = stdout.trim().split('\n').filter(Boolean).slice(0, limit);
      const body = lines.length
        ? lines.map((l) => `- ${l}`).join('\n')
        : `No references found for "${symbol}" under ${root}`;
      const suffix = stderr ? `\n\nrg stderr: ${stderr.trim()}` : '';
      resolve({ ok: true, result: `# References: ${symbol}\n\n${body}${suffix}` });
    });
  });
}
