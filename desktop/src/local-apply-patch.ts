import { BrowserWindow, dialog } from 'electron';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { showPatchApprovalDialog } from './patch-approval-dialog';
import type { PatchOp } from './local-apply-patch-types';
import { shouldRequireToolApproval } from './tool-permission-preferences';
import { applySearchReplaceHunk } from './apply-hunk';
import { recordTouchedFile } from './edit-session';
import { loopbackHttpUrl } from './loopback-host';

const MAX_OPERATIONS = 25;
const MAX_CONTENT_BYTES = 1_500_000;

function allowedRoots(): string[] {
  return [path.resolve(os.homedir()), path.resolve(os.tmpdir())];
}

function isUnderAllowedRoot(resolvedFile: string): boolean {
  const r = path.normalize(resolvedFile);
  for (const root of allowedRoots()) {
    if (r === root || r.startsWith(root + path.sep)) {
      return true;
    }
  }
  return false;
}

function resolveIfAbsolute(p: string): { ok: true; resolved: string } | { ok: false; error: string } {
  if (!p || typeof p !== 'string') {
    return { ok: false, error: 'Missing path' };
  }
  if (!path.isAbsolute(p)) {
    return { ok: false, error: `Path must be absolute: ${p}` };
  }
  const resolved = path.resolve(p);
  if (!isUnderAllowedRoot(resolved)) {
    return {
      ok: false,
      error: `Path must stay under home or system temp: ${resolved}`,
    };
  }
  return { ok: true, resolved };
}

function normalizeOpKind(raw: string): 'create_file' | 'update_file' | 'apply_hunk' | 'delete_file' | null {
  const k = raw.trim().toLowerCase().replace(/-/g, '_');
  if (k === 'create_file' || k === 'create') return 'create_file';
  if (k === 'update_file' || k === 'update' || k === 'write_file' || k === 'write') {
    return 'update_file';
  }
  if (k === 'apply_hunk' || k === 'hunk' || k === 'patch_hunk') return 'apply_hunk';
  if (k === 'delete_file' || k === 'delete' || k === 'unlink') return 'delete_file';
  return null;
}

function parseOperations(rawArgs: Record<string, unknown>): { ok: true; ops: PatchOp[] } | { ok: false; error: string } {
  const raw = rawArgs.operations;
  if (!Array.isArray(raw)) {
    return { ok: false, error: 'operations must be a non-empty array' };
  }
  if (raw.length === 0) {
    return { ok: false, error: 'operations array is empty' };
  }
  if (raw.length > MAX_OPERATIONS) {
    return { ok: false, error: `At most ${MAX_OPERATIONS} operations allowed` };
  }

  const ops: PatchOp[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!item || typeof item !== 'object') {
      return { ok: false, error: `Operation ${i + 1} is not an object` };
    }
    const o = item as Record<string, unknown>;
    const kindRaw =
      (typeof o.op === 'string' && o.op)
      || (typeof o.operation === 'string' && o.operation)
      || (typeof o.type === 'string' && o.type);
    if (!kindRaw) {
      return { ok: false, error: `Operation ${i + 1}: missing op / operation / type` };
    }
    const kind = normalizeOpKind(kindRaw);
    if (!kind) {
      return { ok: false, error: `Operation ${i + 1}: unknown op "${kindRaw}"` };
    }
    const filePath = typeof o.path === 'string' ? o.path : '';
    const pathRes = resolveIfAbsolute(filePath);
    if (!pathRes.ok) {
      return { ok: false, error: `Operation ${i + 1}: ${pathRes.error}` };
    }
    const p = pathRes.resolved;

    if (kind === 'delete_file') {
      ops.push({ kind: 'delete_file', path: p });
      continue;
    }

    if (kind === 'apply_hunk') {
      const search = typeof o.search === 'string' ? o.search : '';
      const replace = typeof o.replace === 'string' ? o.replace : '';
      if (!search) {
        return { ok: false, error: `Operation ${i + 1}: apply_hunk requires search` };
      }
      ops.push({
        kind: 'apply_hunk',
        path: p,
        search,
        replace,
        replaceAll: o.replace_all === true || o.replaceAll === true,
      });
      continue;
    }

    const content = typeof o.content === 'string' ? o.content : '';
    if (Buffer.byteLength(content, 'utf8') > MAX_CONTENT_BYTES) {
      return { ok: false, error: `Operation ${i + 1}: content exceeds ${MAX_CONTENT_BYTES} bytes` };
    }
    if (kind === 'create_file') {
      ops.push({ kind: 'create_file', path: p, content });
    } else {
      ops.push({ kind: 'update_file', path: p, content });
    }
  }
  return { ok: true, ops };
}

async function ensureParentDir(filePath: string): Promise<void> {
  const parent = path.dirname(filePath);
  await fs.mkdir(parent, { recursive: true });
}

async function reindexFileQuiet(filePath: string): Promise<void> {
  const token = process.env.AIGENIUS_SECRET_TOKEN;
  const port = process.env.AIGENIUS_MINI_SERVER_PORT ?? '8001';
  if (!token) return;
  try {
    await fetch(loopbackHttpUrl(port, '/search/reindex'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ paths: [filePath], force: true }),
    });
  } catch {
    /* best-effort */
  }
}

export async function applyLocalPatch(
  parent: BrowserWindow | undefined,
  rawArgs: Record<string, unknown>,
): Promise<{ ok: true; result: string } | { ok: false; error: string }> {
  const parsed = parseOperations(rawArgs);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  const { ops } = parsed;

  if (parent && shouldRequireToolApproval('local_apply_patch')) {
    try {
      const approved = await showPatchApprovalDialog(parent, ops);
      if (!approved) {
        return { ok: false, error: 'User declined to apply file changes' };
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      const { response } = await dialog.showMessageBox(parent, {
        type: 'warning',
        buttons: ['Cancel', 'Apply changes'],
        defaultId: 1,
        cancelId: 0,
        title: 'Local file changes',
        message: `Apply ${ops.length} file operation(s) on this computer?`,
        detail: `Custom approval UI failed (${msg}).\nUse this dialog only if you understand the risk.`,
      });
      if (response !== 1) {
        return { ok: false, error: 'User declined to apply file changes' };
      }
    }
  }

  const results: Array<{ path: string; op: string; status: string; error?: string }> = [];

  for (const op of ops) {
    try {
      if (op.kind === 'delete_file') {
        let target = op.path;
        try {
          target = await fs.realpath(op.path);
        } catch {
          /* use original if missing */
        }
        if (!isUnderAllowedRoot(target)) {
          throw new Error('Resolved path left allowed roots');
        }
        await fs.unlink(target);
        recordTouchedFile(target);
        void reindexFileQuiet(target);
        results.push({ path: target, op: 'delete_file', status: 'ok' });
        continue;
      }

      if (op.kind === 'create_file') {
        const dir = path.dirname(op.path);
        const dirReal = path.resolve(dir);
        if (!isUnderAllowedRoot(dirReal)) {
          throw new Error('Parent directory outside allowed roots');
        }
        await ensureParentDir(op.path);
        try {
          await fs.writeFile(op.path, op.content, { encoding: 'utf8', flag: 'wx' });
        } catch (e: unknown) {
          const code = (e as NodeJS.ErrnoException)?.code;
          if (code === 'EEXIST') {
            throw new Error('File already exists (create_file is exclusive)');
          }
          throw e;
        }
        results.push({ path: op.path, op: 'create_file', status: 'ok' });
        recordTouchedFile(op.path);
        void reindexFileQuiet(op.path);
        continue;
      }

      if (op.kind === 'apply_hunk') {
        const existing = await fs.realpath(op.path);
        if (!isUnderAllowedRoot(existing)) {
          throw new Error('Resolved path left allowed roots');
        }
        const prior = await fs.readFile(existing, 'utf8');
        const hunk = applySearchReplaceHunk(prior, op.search, op.replace, op.replaceAll);
        if (!hunk.ok) {
          throw new Error(hunk.error);
        }
        await fs.writeFile(existing, hunk.content, { encoding: 'utf8', flag: 'w' });
        results.push({ path: existing, op: 'apply_hunk', status: 'ok' });
        recordTouchedFile(existing);
        void reindexFileQuiet(existing);
        continue;
      }

      // update_file
      const existing = await fs.realpath(op.path);
      if (!isUnderAllowedRoot(existing)) {
        throw new Error('Resolved path left allowed roots');
      }
      await fs.writeFile(existing, op.content, { encoding: 'utf8', flag: 'w' });
      results.push({ path: existing, op: 'update_file', status: 'ok' });
      recordTouchedFile(existing);
      void reindexFileQuiet(existing);
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'operation failed';
      results.push({
        path: op.path,
        op: op.kind,
        status: 'error',
        error: msg,
      });
      return {
        ok: true,
        result: JSON.stringify({
          partial: true,
          results,
          error: `Stopped after failure: ${msg}`,
        }),
      };
    }
  }

  return {
    ok: true,
    result: JSON.stringify({ partial: false, results }),
  };
}
