import path from 'path';
import { registerPreviewPath } from '../preview-path-registry';

/** Register a file and its parent directory for local-file:// preview (tool output only). */
export function registerAbsolutePathForPreview(filePath: string): void {
  const trimmed = filePath.trim();
  if (!trimmed || !path.isAbsolute(trimmed)) return;

  registerPreviewPath(trimmed);
  const parent = path.dirname(trimmed);
  if (parent && parent !== trimmed) {
    registerPreviewPath(parent);
  }
}

export function registerRagHitsForPreview(hits: unknown): void {
  if (!Array.isArray(hits)) return;
  for (const hit of hits) {
    if (hit && typeof hit === 'object' && typeof (hit as { path?: string }).path === 'string') {
      registerAbsolutePathForPreview((hit as { path: string }).path);
    }
  }
}

export function registerReadFileBatchForPreview(
  results: Array<{ path?: string; resolvedPath?: string; status?: string }>,
): void {
  for (const r of results) {
    if (r.status === 'error') continue;
    const abs =
      typeof r.resolvedPath === 'string' && r.resolvedPath
        ? r.resolvedPath
        : typeof r.path === 'string' && path.isAbsolute(r.path)
          ? r.path
          : '';
    if (abs) registerAbsolutePathForPreview(abs);
  }
}
