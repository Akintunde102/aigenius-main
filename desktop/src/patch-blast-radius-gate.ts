import path from 'path';
import type { PatchOp } from './local-apply-patch-types';
import { getActiveCodeProjectRootPath } from './active-code-project';
import { loopbackHttpUrl } from './loopback-host';

const CODE_EXTS = new Set(['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs', 'py', 'rs', 'go']);
const BLAST_RADIUS_TTL_MS = 30 * 60 * 1000;

const blastRadiusChecks = new Map<string, number>();

export type BlastRadiusSummary = {
  certain: number;
  heuristic: number;
  inferred: number;
  total: number;
  paths: string[];
  outline: string;
};

function isEphemeralPath(filePath: string): boolean {
  const norm = filePath.replace(/\\/g, '/').toLowerCase();
  return (
    norm.includes('/.aigenius/tmp/') ||
    norm.includes('/node_modules/') ||
    norm.includes('/dist/') ||
    norm.includes('/.next/')
  );
}

function isRiskyPatchOp(op: PatchOp): boolean {
  return op.kind === 'apply_hunk' || op.kind === 'update_file' || op.kind === 'delete_file';
}

export function recordBlastRadiusCheck(keys: string[]): void {
  const now = Date.now();
  for (const key of keys) {
    if (key.trim()) blastRadiusChecks.set(key.trim(), now);
  }
}

export function hasRecentBlastRadiusForPath(filePath: string): boolean {
  const norm = path.normalize(filePath);
  const now = Date.now();
  for (const [key, ts] of blastRadiusChecks) {
    if (now - ts > BLAST_RADIUS_TTL_MS) {
      blastRadiusChecks.delete(key);
      continue;
    }
    if (key === norm || norm.startsWith(key + path.sep) || key.startsWith(norm)) {
      return true;
    }
  }
  return false;
}

export function riskyPatchPaths(ops: PatchOp[]): string[] {
  const projectRoot = getActiveCodeProjectRootPath();
  const paths = new Set<string>();
  for (const op of ops) {
    if (!isRiskyPatchOp(op)) continue;
    const ext = path.extname(op.path).replace(/^\./, '').toLowerCase();
    if (!CODE_EXTS.has(ext)) continue;
    if (isEphemeralPath(op.path)) continue;
    if (projectRoot) {
      const resolved = path.normalize(op.path);
      const root = path.normalize(projectRoot);
      if (!resolved.startsWith(root + path.sep) && resolved !== root) continue;
    }
    paths.add(path.normalize(op.path));
  }
  return [...paths];
}

export function checkBlastRadiusGate(ops: PatchOp[]): string | null {
  if (process.env.AIGENIUS_SKIP_BLAST_RADIUS_GATE === '1') return null;
  const risky = riskyPatchPaths(ops);
  if (!risky.length) return null;
  const missing = risky.filter((p) => !hasRecentBlastRadiusForPath(p));
  if (!missing.length) return null;
  return (
    `Blast-radius check required before editing project code. ` +
    `Call local_symbol_blast_radius for symbols in: ${missing.map((p) => `\`${p}\``).join(', ')} ` +
    `then retry local_apply_patch. (Set AIGENIUS_SKIP_BLAST_RADIUS_GATE=1 to bypass.)`
  );
}

export async function fetchBlastRadiusSummaryForPaths(
  paths: string[],
): Promise<BlastRadiusSummary | null> {
  const token = process.env.AIGENIUS_SECRET_TOKEN;
  const port = process.env.AIGENIUS_MINI_SERVER_PORT ?? '8001';
  if (!token || !paths.length) return null;

  const pathPrefix = getActiveCodeProjectRootPath() ?? '';

  try {
    const res = await fetch(loopbackHttpUrl(port, '/search/import-graph'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ paths, pathPrefix, maxDepth: 3 }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      impacted?: Array<{ path: string; depth: number }>;
      outline?: string;
    };
    const impacted = data.impacted?.length ?? 0;
    if (impacted === 0 && !data.outline) return null;
    return {
      certain: 0,
      heuristic: impacted,
      inferred: 0,
      total: impacted,
      paths,
      outline: data.outline ?? `${impacted} import-dependent file(s)`,
    };
  } catch {
    return null;
  }
}
