import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

async function readDirFilesRecursive(
  dir: string,
  base: string,
): Promise<Array<{ rel: string; content: Buffer }>> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const out: Array<{ rel: string; content: Buffer }> = [];
  for (const ent of entries) {
    const full = path.join(dir, ent.name);
    const rel = path.relative(base, full).replace(/\\/g, '/');
    if (ent.isSymbolicLink()) {
      throw new Error('symlink_refused');
    }
    if (ent.isDirectory()) {
      out.push(...(await readDirFilesRecursive(full, base)));
    } else if (ent.isFile()) {
      out.push({ rel, content: await fs.readFile(full) });
    }
  }
  return out.sort((a, b) => a.rel.localeCompare(b.rel));
}

export async function hashToolFolder(
  folderPath: string,
): Promise<{ ok: true; hash: string } | { ok: false; error: string }> {
  try {
    const files = await readDirFilesRecursive(folderPath, folderPath);
    const h = crypto.createHash('sha256');
    for (const f of files) {
      h.update(f.rel);
      h.update('\0');
      h.update(f.content);
      h.update('\0');
    }
    return { ok: true, hash: h.digest('hex') };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg === 'symlink_refused') {
      return { ok: false, error: 'symlinks are not allowed in tool folders' };
    }
    return { ok: false, error: msg };
  }
}

export { readDirFilesRecursive as readDirFiles };
