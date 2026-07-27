import path from 'path';

const DENY_BASENAMES = new Set([
  '.env',
  'package-lock.json',
  'yarn.lock',
  'pnpm-lock.yaml',
  'bun.lockb',
]);

const DENY_BASENAME_RE = [
  /^\.env\.(?!example$)/i,
  /-lock\.json$/i,
  /\.pem$/i,
  /^id_rsa$/i,
  /^id_ed25519$/i,
];

/** Returns a skip reason, or null if the file may be read in a batch. */
export function batchReadDenyReason(filePath: string): string | null {
  const base = path.basename(filePath.replace(/\\/g, '/'));
  if (!base) return 'invalid path';

  if (DENY_BASENAMES.has(base)) {
    return `${base} is skipped in batch reads (use single-file read if needed)`;
  }

  for (const re of DENY_BASENAME_RE) {
    if (re.test(base)) {
      return `${base} is skipped in batch reads`;
    }
  }

  const norm = filePath.replace(/\\/g, '/').toLowerCase();
  if (norm.includes('/node_modules/')) {
    return 'node_modules paths are skipped in batch reads';
  }

  return null;
}
