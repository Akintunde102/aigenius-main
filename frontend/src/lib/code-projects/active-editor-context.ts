/** Tracks the file currently open in the desktop code preview for chat context. */

const STORAGE_KEY = 'aigenius-active-editor-v1';

export type ActiveEditorContext = {
  path: string;
  name: string;
  line: number;
  character: number;
  selection?: string;
  updatedAtIso: string;
};

let memorySnapshot: ActiveEditorContext | null = null;

function readStorage(): ActiveEditorContext | null {
  if (typeof window === 'undefined') return memorySnapshot;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ActiveEditorContext;
    if (typeof parsed.path === 'string' && parsed.path) return parsed;
  } catch {
    /* ignore */
  }
  return null;
}

function writeStorage(ctx: ActiveEditorContext | null): void {
  memorySnapshot = ctx;
  if (typeof window === 'undefined') return;
  try {
    if (!ctx) localStorage.removeItem(STORAGE_KEY);
    else localStorage.setItem(STORAGE_KEY, JSON.stringify(ctx));
  } catch {
    /* ignore */
  }
}

export function getActiveEditorContext(): ActiveEditorContext | null {
  return memorySnapshot ?? readStorage();
}

export function setActiveEditorContext(ctx: Omit<ActiveEditorContext, 'updatedAtIso'> | null): void {
  if (!ctx || !ctx.path) {
    writeStorage(null);
    return;
  }
  writeStorage({
    ...ctx,
    updatedAtIso: new Date().toISOString(),
  });
}

export function clearActiveEditorContext(): void {
  writeStorage(null);
}

/** Payload for runtimeContext.activeEditor (chat requests). */
export function activeEditorForRuntime(): {
  path: string;
  name: string;
  line: number;
  character: number;
  selection?: string;
} | null {
  const ctx = getActiveEditorContext();
  if (!ctx) return null;
  return {
    path: ctx.path,
    name: ctx.name,
    line: ctx.line,
    character: ctx.character,
    ...(ctx.selection ? { selection: ctx.selection.slice(0, 500) } : {}),
  };
}
