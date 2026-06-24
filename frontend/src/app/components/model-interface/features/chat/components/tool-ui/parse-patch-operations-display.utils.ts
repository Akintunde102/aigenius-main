export type PatchOpKind = 'create_file' | 'update_file' | 'delete_file';

export type ParsedPatchOperation =
  | { kind: PatchOpKind; path: string; content: string | null }
  | { kind: 'invalid'; path: string | null; detail: string };

const MAX_PREVIEW_CHARS = 120_000;
const MAX_OPS = 30;

function normalizeOpKind(raw: string): PatchOpKind | null {
  const k = raw.trim().toLowerCase().replace(/-/g, '_');
  if (k === 'create_file' || k === 'create') return 'create_file';
  if (k === 'update_file' || k === 'update' || k === 'write_file' || k === 'write') {
    return 'update_file';
  }
  if (k === 'delete_file' || k === 'delete' || k === 'unlink') return 'delete_file';
  return null;
}

function truncateContent(s: string): string {
  if (s.length <= MAX_PREVIEW_CHARS) return s;
  return `${s.slice(0, MAX_PREVIEW_CHARS)}\n\n… (${s.length - MAX_PREVIEW_CHARS} more characters truncated for display)`;
}

/**
 * Parse `local_apply_patch` tool arguments for display only (mirrors desktop executor loosely).
 */
export function parsePatchOperationsForDisplay(
  args: Record<string, unknown> | undefined,
):
  | { ok: true; operations: ParsedPatchOperation[] }
  | { ok: false; userMessage: string; detail?: string } {
  if (!args || typeof args !== 'object') {
    return { ok: false, userMessage: 'No patch details were included with this message.' };
  }
  const raw = args.operations;
  if (!Array.isArray(raw)) {
    return {
      ok: false,
      userMessage: 'This patch request is missing a list of file operations.',
      detail: 'Expected `operations` to be a non-empty array.',
    };
  }
  if (raw.length === 0) {
    return { ok: false, userMessage: 'The patch lists zero file changes.' };
  }
  if (raw.length > MAX_OPS) {
    return {
      ok: false,
      userMessage: `This patch lists too many operations to show here (${raw.length}; max ${MAX_OPS}).`,
    };
  }

  const operations: ParsedPatchOperation[] = [];
  for (let i = 0; i < raw.length; i++) {
    const item = raw[i];
    if (!item || typeof item !== 'object') {
      operations.push({
        kind: 'invalid',
        path: null,
        detail: `Operation ${i + 1} is not an object.`,
      });
      continue;
    }
    const o = item as Record<string, unknown>;
    const kindRaw =
      (typeof o.op === 'string' && o.op) ||
      (typeof o.operation === 'string' && o.operation) ||
      (typeof o.type === 'string' && o.type);
    if (!kindRaw) {
      operations.push({
        kind: 'invalid',
        path: typeof o.path === 'string' ? o.path : null,
        detail: `Operation ${i + 1}: missing op / operation / type.`,
      });
      continue;
    }
    const kind = normalizeOpKind(kindRaw);
    if (!kind) {
      operations.push({
        kind: 'invalid',
        path: typeof o.path === 'string' ? o.path : null,
        detail: `Operation ${i + 1}: unknown op "${kindRaw}".`,
      });
      continue;
    }
    const filePath = typeof o.path === 'string' ? o.path : '';
    if (!filePath.trim()) {
      operations.push({
        kind: 'invalid',
        path: null,
        detail: `Operation ${i + 1}: missing or invalid path.`,
      });
      continue;
    }

    if (kind === 'delete_file') {
      operations.push({ kind: 'delete_file', path: filePath, content: null });
      continue;
    }

    const content = typeof o.content === 'string' ? truncateContent(o.content) : '';
    operations.push({ kind, path: filePath, content });
  }

  return { ok: true, operations };
}

export function summarizePatchOperations(operations: ParsedPatchOperation[]): string {
  let creates = 0;
  let updates = 0;
  let deletes = 0;
  let invalid = 0;
  for (const op of operations) {
    if (op.kind === 'invalid') invalid += 1;
    else if (op.kind === 'create_file') creates += 1;
    else if (op.kind === 'update_file') updates += 1;
    else if (op.kind === 'delete_file') deletes += 1;
  }
  const parts: string[] = [];
  if (creates) parts.push(`${creates} create${creates === 1 ? '' : 's'}`);
  if (updates) parts.push(`${updates} update${updates === 1 ? '' : 's'}`);
  if (deletes) parts.push(`${deletes} delete${deletes === 1 ? '' : 's'}`);
  if (invalid) parts.push(`${invalid} invalid entr${invalid === 1 ? 'y' : 'ies'}`);
  return parts.length ? parts.join(', ') : 'No operations';
}

/**
 * Build a unified-diff-style text for proposed file body (no prior snapshot — all additions).
 */
export function proposedBodyAsUnifiedDiffLines(displayPath: string, newContent: string): string[] {
  const lines = newContent.split(/\r?\n/);
  const out: string[] = [`--- /dev/null`, `+++ ${displayPath}`];
  for (const line of lines) {
    out.push(`+${line}`);
  }
  return out;
}
