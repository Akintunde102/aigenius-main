import { createRequire } from 'module';
import fs from 'fs';
import { spawnSync } from 'child_process';

const nodeRequire = createRequire(__filename);

let cachedBundledPath: string | null | undefined;

export function getBundledRipgrepPath(): string | null {
  if (cachedBundledPath !== undefined) {
    return cachedBundledPath;
  }
  try {
    const mod = nodeRequire('@vscode/ripgrep') as { rgPath?: string };
    const candidate = mod.rgPath?.trim();
    if (candidate && fs.existsSync(candidate)) {
      cachedBundledPath = candidate;
      return candidate;
    }
  } catch {
    /* optional in dev */
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
