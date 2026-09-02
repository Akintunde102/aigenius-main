import { createRequire } from 'node:module';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';

const require = createRequire(import.meta.url);

let cachedBundledPath: string | null | undefined;

/** VS Code / Cursor pattern: ship @vscode/ripgrep and spawn rgPath directly. */
export function getBundledRipgrepPath(): string | null {
  if (cachedBundledPath !== undefined) {
    return cachedBundledPath;
  }
  try {
    const mod = require('@vscode/ripgrep') as { rgPath?: string };
    const candidate = mod.rgPath?.trim();
    if (candidate && fs.existsSync(candidate)) {
      cachedBundledPath = candidate;
      return candidate;
    }
  } catch {
    /* package not installed in this build */
  }
  cachedBundledPath = null;
  return null;
}

export function isSystemRipgrepAvailable(): boolean {
  const probe = process.platform === 'win32' ? ['where', 'rg'] : ['which', 'rg'];
  const res = spawnSync(probe[0], [probe[1]], { encoding: 'utf8', windowsHide: true });
  return res.status === 0;
}

export type GrepEngine = 'bundled-ripgrep' | 'system-ripgrep' | 'builtin';

export function selectGrepEngine(): { engine: GrepEngine; executable: string | null } {
  const bundled = getBundledRipgrepPath();
  if (bundled) {
    return { engine: 'bundled-ripgrep', executable: bundled };
  }
  if (isSystemRipgrepAvailable()) {
    return { engine: 'system-ripgrep', executable: 'rg' };
  }
  return { engine: 'builtin', executable: null };
}
