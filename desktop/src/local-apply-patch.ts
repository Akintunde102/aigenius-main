import { app, BrowserWindow, dialog } from 'electron';
import { isInsideToolbox } from './toolbox/paths';
import fs from 'fs/promises';
import path from 'path';
import os from 'os';
import { showPatchApprovalDialog } from './patch-approval-dialog';
import type { PatchOp } from './local-apply-patch-types';
import { shouldRequireToolApproval } from './tool-permission-preferences';
import { applySearchReplaceHunk } from './apply-hunk';
import { recordTouchedFile } from './edit-session';
import { loopbackHttpUrl } from './loopback-host';
import { MINI_SERVER_PORT } from './mini-server-port';
import {
  checkBlastRadiusGate,
  fetchBlastRadiusSummaryForPaths,
  riskyPatchPaths,
} from './patch-blast-radius-gate';

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
  try {
    if (isInsideToolbox(app.getPath('userData'), resolved)) {
      return { ok: false, error: 'Cannot modify toolbox storage via local_apply_patch' };
    }
  } catch {
    /* ignore outside Electron */
  }
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
  const port = MINI_SERVER_PORT;
  if (!token) return;
  try {
    await fetch(loopbackHttpUrl(port, '/search/reindex'), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ paths: [filePath], force: true, priority: 'fast_pocket' }),
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

  const gateError = checkBlastRadiusGate(ops);
  if (gateError) {
    return { ok: false, error: gateError };
  }

  const riskyPaths = riskyPatchPaths(ops);
  let blastSummary = null;
  if (riskyPaths.length) {
    try {
      blastSummary = await fetchBlastRadiusSummaryForPaths(riskyPaths);
    } catch {
      /* ignore */
    }
  }

  if (parent && shouldRequireToolApproval('local_apply_patch')) {
    try {
      const approved = await showPatchApprovalDialog(parent, ops, blastSummary);
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

  // --- Phase 1: Pre-flight dry-run and in-memory simulation ---
  const stagedContents = new Map<string, string>();
  const stagedDeletions = new Set<string>();
  const preImages = new Map<string, string | null>();
  const opAudit: Array<{ path: string; op: string; status: string; error?: string }> = [];

  for (let i = 0; i < ops.length; i++) {
    const op = ops[i];
    try {
      if (op.kind === 'delete_file') {
        let target = op.path;
        try {
          target = await fs.realpath(op.path);
        } catch {
          target = path.resolve(op.path);
        }
        if (!isUnderAllowedRoot(target)) {
          throw new Error('Resolved path left allowed roots');
        }

        if (!preImages.has(target)) {
          try {
            const diskContent = await fs.readFile(target, 'utf8');
            preImages.set(target, diskContent);
          } catch {
            preImages.set(target, null);
          }
        }

        stagedContents.delete(target);
        stagedDeletions.add(target);
        opAudit.push({ path: target, op: 'delete_file', status: 'ok' });
        continue;
      }

      if (op.kind === 'create_file') {
        const dir = path.dirname(op.path);
        let dirReal = dir;
        try {
          dirReal = await fs.realpath(dir);
        } catch {
          dirReal = path.resolve(dir);
        }
        if (!isUnderAllowedRoot(dirReal)) {
          throw new Error('Parent directory outside allowed roots');
        }

        const target = path.resolve(op.path);
        if (!isUnderAllowedRoot(target)) {
          throw new Error('Resolved path left allowed roots');
        }

        const existsInStaged = stagedContents.has(target);
        const deletedInStaged = stagedDeletions.has(target);
        let existsOnDisk = false;
        try {
          await fs.access(target);
          existsOnDisk = true;
        } catch {
          existsOnDisk = false;
        }

        if ((existsOnDisk && !deletedInStaged) || existsInStaged) {
          throw new Error('File already exists (create_file is exclusive)');
        }

        if (!preImages.has(target)) {
          preImages.set(target, existsOnDisk ? await fs.readFile(target, 'utf8').catch(() => null) : null);
        }

        stagedDeletions.delete(target);
        stagedContents.set(target, op.content);
        opAudit.push({ path: target, op: 'create_file', status: 'ok' });
        continue;
      }

      if (op.kind === 'apply_hunk') {
        let target = op.path;
        try {
          target = await fs.realpath(op.path);
        } catch {
          target = path.resolve(op.path);
        }
        if (!isUnderAllowedRoot(target)) {
          throw new Error('Resolved path left allowed roots');
        }

        let currentContent: string;
        if (stagedContents.has(target)) {
          currentContent = stagedContents.get(target)!;
        } else if (stagedDeletions.has(target)) {
          throw new Error('Cannot apply hunk: file was marked for deletion in this batch');
        } else {
          try {
            currentContent = await fs.readFile(target, 'utf8');
            if (!preImages.has(target)) {
              preImages.set(target, currentContent);
            }
          } catch {
            throw new Error(`File does not exist: ${target}`);
          }
        }

        const hunk = applySearchReplaceHunk(currentContent, op.search, op.replace, op.replaceAll);
        if (!hunk.ok) {
          throw new Error(hunk.error);
        }

        stagedContents.set(target, hunk.content);
        opAudit.push({ path: target, op: 'apply_hunk', status: 'ok' });
        continue;
      }

      // update_file
      let target = op.path;
      try {
        target = await fs.realpath(op.path);
      } catch {
        target = path.resolve(op.path);
      }
      if (!isUnderAllowedRoot(target)) {
        throw new Error('Resolved path left allowed roots');
      }

      if (!preImages.has(target)) {
        try {
          const diskContent = await fs.readFile(target, 'utf8');
          preImages.set(target, diskContent);
        } catch {
          preImages.set(target, null);
        }
      }

      stagedDeletions.delete(target);
      stagedContents.set(target, op.content);
      opAudit.push({ path: target, op: 'update_file', status: 'ok' });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Operation dry-run failed';
      opAudit.push({
        path: op.path,
        op: op.kind,
        status: 'error',
        error: msg,
      });
      return {
        ok: true,
        result: JSON.stringify({
          partial: false,
          success: false,
          results: opAudit,
          error: `Pre-flight dry-run failed at operation ${i + 1} (${op.kind}): ${msg}. No files were changed.`,
        }),
      };
    }
  }

  // --- Phase 2: Atomic Disk Application & Rollback Guarantee ---
  const appliedRollbacks: Array<() => Promise<void>> = [];
  const touchedPaths: string[] = [];

  try {
    for (const deletePath of stagedDeletions) {
      const prior = preImages.get(deletePath);
      let existedOnDisk = false;
      try {
        await fs.access(deletePath);
        existedOnDisk = true;
      } catch {
        existedOnDisk = false;
      }

      if (existedOnDisk) {
        await fs.unlink(deletePath);
        touchedPaths.push(deletePath);
        if (prior !== null && prior !== undefined) {
          appliedRollbacks.push(async () => {
            await ensureParentDir(deletePath);
            await fs.writeFile(deletePath, prior, 'utf8');
          });
        }
      }
    }

    for (const [targetPath, newContent] of stagedContents.entries()) {
      const prior = preImages.get(targetPath);
      const isNew = prior === null;

      await ensureParentDir(targetPath);
      await fs.writeFile(targetPath, newContent, 'utf8');
      touchedPaths.push(targetPath);

      if (isNew) {
        appliedRollbacks.push(async () => {
          await fs.unlink(targetPath).catch(() => {});
        });
      } else if (prior !== undefined && prior !== null) {
        appliedRollbacks.push(async () => {
          await fs.writeFile(targetPath, prior, 'utf8').catch(() => {});
        });
      }
    }
  } catch (diskErr: unknown) {
    for (let j = appliedRollbacks.length - 1; j >= 0; j--) {
      try {
        await appliedRollbacks[j]();
      } catch {
        /* best-effort rollback */
      }
    }

    const diskMsg = diskErr instanceof Error ? diskErr.message : 'Disk write failure';
    return {
      ok: true,
      result: JSON.stringify({
        partial: false,
        success: false,
        results: opAudit.map((item) => ({ ...item, status: 'rolled_back' })),
        error: `Disk write failed: ${diskMsg}. All disk mutations were rolled back.`,
      }),
    };
  }

  for (const p of touchedPaths) {
    recordTouchedFile(p);
    void reindexFileQuiet(p);
  }

  return {
    ok: true,
    result: JSON.stringify({
      partial: false,
      results: opAudit,
      ...(blastSummary
        ? {
            blastRadius: {
              certain: blastSummary.certain,
              heuristic: blastSummary.heuristic,
              inferred: blastSummary.inferred,
              total: blastSummary.total,
            },
          }
        : {}),
    }),
  };
}
