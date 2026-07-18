/** Main-process mirror of renderer active editor (for local tool defaults). */

export type MainActiveEditor = {
  path: string;
  name: string;
  line: number;
  character: number;
  selection?: string;
};

let snapshot: MainActiveEditor | null = null;

export function setMainActiveEditor(ctx: MainActiveEditor | null): void {
  snapshot = ctx;
}

export function getMainActiveEditor(): MainActiveEditor | null {
  return snapshot;
}

export function applyEditorDefaultsToToolArgs(
  raw: Record<string, unknown>,
  fields: { path?: boolean; line?: boolean; character?: boolean; symbol?: boolean },
): Record<string, unknown> {
  const editor = getMainActiveEditor();
  if (!editor) return raw;
  const out = { ...raw };
  if (fields.path && !out.path && !out.cwd) out.path = editor.path;
  if (fields.line && out.line == null) out.line = editor.line;
  if (fields.character && out.character == null) out.character = editor.character;
  if (fields.symbol && !out.symbol && editor.selection?.trim()) {
    const sel = editor.selection.trim();
    if (sel.length < 80 && !sel.includes('\n')) out.symbol = sel;
  }
  return out;
}
