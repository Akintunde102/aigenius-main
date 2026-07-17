/**
 * Root layout sets this on `<html>` via {@link DesktopShellDocumentFlag} (Electron UA) so desktop
 * detection works without a separate desktop-only Next build flag.
 */
const DESKTOP_SHELL_HTML_FLAG = "data-aigenius-desktop-shell";

/**
 * True when the renderer is the AIGenius Electron shell (preload exposes `aigeniusDesktop`).
 * Used to route auth to `/desktop-login` instead of the web `/login` surface.
 */
const isDevBridgeDiag =
  typeof process !== "undefined" && process.env.NODE_ENV === "development";

export function isAigeniusDesktopRuntime(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  const isDesktop = window.aigeniusDesktop?.isDesktop === true;
  if (isDevBridgeDiag) {
    (window as any).__aigenius_bridge_debug = {
      ...((window as any).__aigenius_bridge_debug || {}),
      isDesktop,
      lastChecked: new Date().toISOString(),
    };
  }
  return isDesktop;
}

/**
 * True when the Electron shell flag was applied on `<html>` (see `DesktopShellDocumentFlag`),
 * even if `preload` has not attached `window.aigeniusDesktop` yet.
 */
export function isDesktopShellFromBuild(): boolean {
  if (typeof document === "undefined") {
    return false;
  }
  try {
    return (
      document.documentElement.getAttribute(DESKTOP_SHELL_HTML_FLAG) === "1"
    );
  } catch {
    return false;
  }
}

/**
 * Synchronous: preload exposed `window.aigeniusDesktop`.
 * The HTML flag is set for Electron UA only — a normal browser keeps `"0"`; do **not** use the flag
 * alone to enable `local_*` tools.
 */
export function isAigeniusDesktopChatShell(): boolean {
  return isAigeniusDesktopRuntime();
}

/**
 * True when the renderer is probably Electron (e.g. Next loaded in `BrowserWindow`). Preload may
 * attach `window.aigeniusDesktop` shortly after load.
 * Note: some builds strip `Electron/` from `navigator.userAgent`; pair with
 * {@link isDesktopShellFromBuild} for polling when enabling local tools.
 */
export function isLikelyElectronRenderer(): boolean {
  if (typeof navigator === "undefined") {
    return false;
  }
  return /\bElectron\/\d/.test(navigator.userAgent || "");
}

/** Browser on desktop auth routes: fail fast (~600ms). Electron dev cold load: wait longer for preload. */
const FAST_DESKTOP_RUNTIME_POLL_ATTEMPTS = 24;
const EXTENDED_DESKTOP_RUNTIME_POLL_ATTEMPTS = 400;

/**
 * Query flag appended by the Electron main window (and OAuth handoff) so `/desktop-login` can use a
 * longer preload poll without making every browser visit wait ~10s. Not a trust boundary.
 * Keep in sync with `desktop/src/main.ts` and `desktop/src/navigation-guards.ts`.
 */
export const DESKTOP_SHELL_ENTRY_QUERY_PARAM = "aigenius_shell";

/**
 * Poll options for `/desktop-login` (and legacy `/desktop-welcome`): extended budget only when this is
 * almost certainly the Electron shell (entry query, HTML shell flag, or `Electron/` in UA).
 */
export function getDesktopShellEntryRuntimeResolveOptions(): {
  pollMs: number;
  maxAttempts: number;
} {
  if (typeof window === "undefined") {
    return { pollMs: 25, maxAttempts: FAST_DESKTOP_RUNTIME_POLL_ATTEMPTS };
  }
  let fromEntryQuery = false;
  try {
    const q = new URLSearchParams(window.location.search).get(
      DESKTOP_SHELL_ENTRY_QUERY_PARAM,
    );
    fromEntryQuery = q === "1" || q === "true";
  } catch {
    fromEntryQuery = false;
  }
  const extended =
    fromEntryQuery ||
    isDesktopShellFromBuild() ||
    isLikelyElectronRenderer();
  return {
    pollMs: 25,
    maxAttempts: extended
      ? EXTENDED_DESKTOP_RUNTIME_POLL_ATTEMPTS
      : FAST_DESKTOP_RUNTIME_POLL_ATTEMPTS,
  };
}

function defaultDesktopRuntimePollAttempts(): number {
  if (typeof window === "undefined") {
    return FAST_DESKTOP_RUNTIME_POLL_ATTEMPTS;
  }
  if (isDesktopShellFromBuild() || isLikelyElectronRenderer()) {
    return EXTENDED_DESKTOP_RUNTIME_POLL_ATTEMPTS;
  }
  return FAST_DESKTOP_RUNTIME_POLL_ATTEMPTS;
}

/**
 * Resolves desktop detection after preload may load slightly after the first paint.
 * Invokes `onResolved(true)` as soon as the shell is detected, or `onResolved(false)` after the poll budget.
 */
export function resolveAigeniusDesktopRuntime(
  onResolved: (isDesktop: boolean) => void,
  options?: { pollMs?: number; maxAttempts?: number },
): () => void {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  if (isAigeniusDesktopRuntime()) {
    queueMicrotask(() => onResolved(true));
    return () => undefined;
  }
  const pollMs = options?.pollMs ?? 25;
  const maxAttempts = options?.maxAttempts ?? defaultDesktopRuntimePollAttempts();
  let attempts = 0;
  const id = window.setInterval(() => {
    attempts += 1;
    if (isAigeniusDesktopRuntime()) {
      window.clearInterval(id);
      onResolved(true);
    } else if (attempts >= maxAttempts) {
      window.clearInterval(id);
      onResolved(false);
    }
  }, pollMs);
  return () => window.clearInterval(id);
}

/** PNG payload from Electron (`desktopCapturer` or window capture); queued into the chat composer. */
export type DesktopChatScreenshotPayload = {
  base64: string;
  mimeType: string;
  basename: string;
};

export type AigeniusDesktopBridgeSurface = {
  isDesktop?: boolean;
  openExternal?: (url: string) => void;
  /** Fires when the Electron main window regains OS focus (e.g. after system-browser payment). */
  onMainWindowFocus?: (handler: () => void) => () => void;
  runLocalDesktopTool?: (
    payload: { tool: string; arguments: Record<string, unknown> },
    options?: { onShellStreamChunk?: (chunk: { stream: string; text: string }) => void },
  ) => Promise<{ ok: boolean; result?: string; rawData?: any; error?: string }>;
  getChatRuntimeContext?: () => Promise<unknown>;
  // Local file search
  searchFiles?: (
    term: string,
    limit?: number,
  ) => Promise<Array<{ path: string; name: string; mtime: number; excerpt: string; rank: number; tags: string }>>;
  searchStatus?: () => Promise<{
    indexed: number;
    watching: boolean;
    lastRun: number;
  }>;
  searchReindex?: (payload: { paths?: string[]; force?: boolean }) => Promise<{ queued: number }>;
  searchRemove?: (filePath: string) => Promise<{ ok: boolean }>;
  searchBrowse?: (
    payload?: Record<string, unknown>,
  ) => Promise<{
    rows: Array<{
      path: string;
      name: string;
      folderPath?: string;
      mtime: number;
      extension: string;
      tags: string;
      contentPreview: string;
      contentHead?: string;
      contentTail?: string;
      contentChars?: number;
    }>;
    total: number;
    error?: boolean;
  }>;
  /** Distinct-folder rollups (same auth as browse). */
  searchFolders?: (
    payload?: Record<string, unknown>,
  ) => Promise<{
    folders: Array<{ folderPath: string; fileCount: number; maxMtime: number }>;
    total: number;
    error?: boolean;
  }>;
  /** Explorer-style directory drill-down (folders + files in one listing). */
  searchExplorer?: (
    payload?: Record<string, unknown>,
  ) => Promise<{
    mode: "root" | "dir";
    currentDirectory: string;
    parentDirectory: string | null;
    breadcrumbPrefixes: string[];
    folders: Array<{ folderPath: string; name: string; fileCountRecursive: number; maxMtime: number }>;
    files: Array<{
      path: string;
      name: string;
      folderPath?: string;
      mtime: number;
      extension: string;
      tags: string;
      contentPreview: string;
      contentHead?: string;
      contentTail?: string;
      contentChars?: number;
    }>;
    totalRootFolders: number;
    totalFilesInDirectory: number;
    subtreeScanTruncated: boolean;
    error?: boolean | string;
  }>;
  searchRow?: (
    filePath: string,
    maxContentChars?: number,
  ) => Promise<
    | {
        path: string;
        name: string;
        mtime: number;
        extension: string;
        tags: string;
        content: string;
        contentTruncated: boolean;
      }
    | { error: string }
  >;
  openFile?: (filePath: string) => Promise<{ ok: boolean; error: string }>;
  revealFileInFolder?: (filePath: string) => Promise<{ ok: boolean; error?: string }>;
  readLocalFilePreview?: (
    filePath: string,
  ) => Promise<
    | { ok: true; kind: "image"; mimeType: string; base64: string }
    | { ok: true; kind: "text"; mimeType: string; text: string }
    | { ok: false; error: string; maxBytes?: number }
  >;
  /** Capture this BrowserWindow as PNG (invoke from renderer). */
  captureWindowForChat?: () => Promise<
    | { ok: true; base64: string; mimeType: string; basename: string }
    | { ok: false; error: string }
  >;
  /** Full desktop → chat (View / global shortcut). Handler receives one or more PNG parts (multi-monitor). */
  onQueueChatScreenshot?: (
    handler: (items: DesktopChatScreenshotPayload[]) => void,
  ) => () => void;
};

function sameOriginWindowCandidates(): Window[] {
  if (typeof window === "undefined") {
    return [];
  }
  const out: Window[] = [window];
  try {
    if (window.top && window.top !== window) {
      out.push(window.top);
    }
  } catch (err) {
    /* cross-origin top */
    if (isDevBridgeDiag) {
      console.debug("[AIGenius Bridge] Access to window.top denied (cross-origin)", err);
    }
  }
  try {
    if (window.opener && !window.opener.closed) {
      out.push(window.opener);
    }
  } catch {
    /* cross-origin opener */
  }
  return out;
}

/** Same renderer session: avoid re-scanning browsing contexts on every chat request. */
let cachedRunnableDesktopToolBridge: AigeniusDesktopBridgeSurface | null = null;

/** Clears the runnable-bridge cache (Jest / dev diagnostics only). */
export function resetDesktopRunnableBridgeCacheForTests(): void {
  cachedRunnableDesktopToolBridge = null;
}

function ensureRunnableLocalDesktopToolBridge():
  | AigeniusDesktopBridgeSurface
  | null {
  if (typeof window === "undefined") {
    return null;
  }
  if (
    cachedRunnableDesktopToolBridge
    && typeof cachedRunnableDesktopToolBridge.runLocalDesktopTool === "function"
  ) {
    return cachedRunnableDesktopToolBridge;
  }
  for (const w of sameOriginWindowCandidates()) {
    const b = (w as Window & { aigeniusDesktop?: AigeniusDesktopBridgeSurface })
      .aigeniusDesktop;

    if (isDevBridgeDiag && b) {
      console.debug("[AIGenius Bridge] Scanning window for bridge:", {
        isTop: w === window.top,
        isWindow: w === window,
        hasBridge: true,
        isDesktop: b.isDesktop,
        hasRunLocal: typeof b.runLocalDesktopTool === "function",
        bridgeKeys: Object.keys(b),
      });
    }

    if (typeof b?.runLocalDesktopTool === "function") {
      cachedRunnableDesktopToolBridge = b;
      if (isDevBridgeDiag) {
        (window as any).__aigenius_bridge_debug = {
          lastFoundAt: new Date().toISOString(),
          foundInWindow: w === window ? "current" : (w === window.top ? "top" : "other"),
          bridge: b,
        };
      }
      return b;
    }
  }
  return null;
}

/**
 * True when `runLocalDesktopTool` exists (authoritative for `local_*` / `client_delegate`).
 * Scans `window`, `window.top`, and `window.opener` (same-origin).
 */
export function hasRunnableLocalDesktopToolBridge(): boolean {
  return ensureRunnableLocalDesktopToolBridge() !== null;
}

/** First browsing context that exposes a runnable local-tool bridge. */
export function getRunnableLocalDesktopBridge():
  | AigeniusDesktopBridgeSurface
  | undefined {
  return ensureRunnableLocalDesktopToolBridge() ?? undefined;
}

/**
 * Any `aigeniusDesktop` (e.g. for `getChatRuntimeContext`) when the runnable tool API is absent.
 */
export function getAigeniusDesktopBridgeFromBrowsingContext():
  | AigeniusDesktopBridgeSurface
  | undefined {
  const runnable = getRunnableLocalDesktopBridge();
  if (runnable) {
    return runnable;
  }
  if (typeof window === "undefined") {
    return undefined;
  }
  for (const w of sameOriginWindowCandidates()) {
    const b = (w as Window & { aigeniusDesktop?: AigeniusDesktopBridgeSurface })
      .aigeniusDesktop;
    if (b?.isDesktop === true) {
      return b;
    }
  }
  return undefined;
}

/**
 * Resolves after preload exposes `window.aigeniusDesktop` or after `maxWaitMs`.
 * @returns whether `isAigeniusDesktopRuntime()` is true when done
 */
export function waitForAigeniusDesktopBridge(maxWaitMs: number): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }
  if (isAigeniusDesktopRuntime()) {
    return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    const pollMs = 25;
    const maxAttempts = Math.max(1, Math.ceil(maxWaitMs / pollMs));
    resolveAigeniusDesktopRuntime(resolve, { pollMs, maxAttempts });
  });
}

/**
 * Poll until {@link hasRunnableLocalDesktopToolBridge} or timeout.
 */
export function waitForLocalDesktopToolBridge(maxWaitMs: number): Promise<boolean> {
  if (typeof window === "undefined") {
    return Promise.resolve(false);
  }
  if (hasRunnableLocalDesktopToolBridge()) {
    if (isDevBridgeDiag) {
      console.debug("[AIGenius Bridge] Bridge found immediately.");
    }
    return Promise.resolve(true);
  }
  if (isDevBridgeDiag) {
    console.debug(`[AIGenius Bridge] Waiting for bridge (up to ${maxWaitMs}ms)...`);
  }
  return new Promise((resolve) => {
    const pollMs = 25;
    const maxAttempts = Math.max(1, Math.ceil(maxWaitMs / pollMs));
    let attempts = 0;
    const id = window.setInterval(() => {
      attempts += 1;
      if (hasRunnableLocalDesktopToolBridge()) {
        window.clearInterval(id);
        if (isDevBridgeDiag) {
          console.debug(`[AIGenius Bridge] Bridge found after ${attempts * pollMs}ms.`);
        }
        resolve(true);
      } else if (attempts >= maxAttempts) {
        window.clearInterval(id);
        console.warn(`[AIGenius Bridge] Timeout waiting for bridge after ${maxWaitMs}ms.`);
        resolve(false);
      }
    }, pollMs);
  });
}

/**
 * Whether the next chat completion should send `x-aigenius-desktop` and merge IPC runtime.
 * Requires a real `runLocalDesktopTool` IPC (not `isDesktop` alone, not HTML build flag alone).
 * Polls when Electron is likely **or** the desktop Next bundle is active (covers stripped UA).
 */
export async function resolveDesktopChatRequestContext(
  maxWaitMs = 8000,
): Promise<boolean> {
  if (typeof window === "undefined") {
    return false;
  }
  if (hasRunnableLocalDesktopToolBridge()) {
    return true;
  }
  const mayReceivePreload =
    isLikelyElectronRenderer() || isDesktopShellFromBuild();
  if (!mayReceivePreload) {
    return false;
  }
  return waitForLocalDesktopToolBridge(maxWaitMs);
}
