import { contextBridge, ipcRenderer } from 'electron';

// Setup error handlers to prevent crashes
if (typeof window !== 'undefined') {
  window.addEventListener('error', (event) => {
    console.error('[Preload Error]', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno,
    });

    // Prevent crash for known issues
    if (event.message && event.message.includes('dragEvent is not defined')) {
      console.warn('[Preload] Suppressing dragEvent error to prevent crash');
      event.preventDefault();
      return false;
    }
  });

  window.addEventListener('unhandledrejection', (event) => {
    console.error('[Preload Unhandled Rejection]', event.reason);
    event.preventDefault();
  });
}

/** Sandboxed preload cannot `require` sibling modules; keep in sync with `shell-chrome.ts`. */
const MAIN_SHELL_MAC_TITLE_TOP_PX = 30;
const MAIN_SHELL_OVERLAY_HEIGHT_PX = 36;

/** Space reserved for native window controls (WCO) on the right; keep the client “new window” button left of it. */
const MAIN_SHELL_WIN_LINUX_WCO_RIGHT_INSET_PX = 138;
const MAIN_SHELL_DARWIN_TITLEBAR_RIGHT_INSET_PX = 12;

function mainShellRendererChrome(platform: NodeJS.Platform): {
  titleBarTopPx: number;
  contentLeftPx: number;
  titleBarRightInsetPx: number;
} {
  if (platform === 'darwin') {
    return {
      titleBarTopPx: MAIN_SHELL_MAC_TITLE_TOP_PX,
      contentLeftPx: 0,
      titleBarRightInsetPx: MAIN_SHELL_DARWIN_TITLEBAR_RIGHT_INSET_PX,
    };
  }
  return {
    titleBarTopPx: MAIN_SHELL_OVERLAY_HEIGHT_PX,
    contentLeftPx: 0,
    titleBarRightInsetPx: MAIN_SHELL_WIN_LINUX_WCO_RIGHT_INSET_PX,
  };
}

type RunLocalPayload = { tool: string; arguments: Record<string, unknown> };

type ShellStreamChunk = { stream: 'stdout' | 'stderr'; text: string };

type RunLocalOptions = {
  onShellStreamChunk?: (chunk: ShellStreamChunk) => void;
};

const shellChrome = mainShellRendererChrome(process.platform);

const DESKTOP_QUEUE_CHAT_SCREENSHOT_CHAN = 'aigenius-desktop-queue-chat-screenshot';

if (process.env.NODE_ENV !== 'production') {
  console.debug('[AIGenius Bridge] Exposing bridge to main world at:', new Date().toISOString());
}

contextBridge.exposeInMainWorld('aigeniusDesktop', {
  isDesktop: true,
  exposedAtIso: new Date().toISOString(),
  shellChrome,
  getChatRuntimeContext: (): Promise<{
    desktopHost: { platform: string; arch: string; release: string; userHomeDir: string };
    retrievalMemoryCatalog: {
      generatedAtIso: string;
      entries: Array<{ slug: string; name: string; description: string; tags: string[] }>;
    };
  }> => ipcRenderer.invoke('get-chat-runtime-context') as Promise<{
    desktopHost: { platform: string; arch: string; release: string; userHomeDir: string };
    retrievalMemoryCatalog: {
      generatedAtIso: string;
      entries: Array<{ slug: string; name: string; description: string; tags: string[] }>;
    };
  }>,
  getLocalSearchIndexState: () =>
    ipcRenderer.invoke('get-local-search-index-state') as Promise<{
      reportedAtIso: string;
      mode: 'active_project_warming' | 'active_project_ready' | 'no_active_project';
      activeProject?: {
        projectId: string;
        rootPath: string;
        indexedFiles: number;
        indexReady: boolean;
        scanInProgress: boolean;
        lastRunMs: number;
      };
      catalogs: Array<{
        projectId: string;
        rootPath: string;
        indexedFiles: number;
        indexReady: boolean;
        scanInProgress: boolean;
        lastRunMs: number;
        isActive: boolean;
      }>;
    }>,
  syncToolPermissionPreferences: (prefs: {
    autoApproveAll: boolean;
    requireApprovalByTool: Record<string, boolean>;
  }) => ipcRenderer.invoke('tool-permissions:sync', prefs) as Promise<{
    autoApproveAll: boolean;
    requireApprovalByTool: Record<string, boolean>;
  }>,
  openExternal: (url: string) => {
    ipcRenderer.send('open-external', url);
  },
  onMainWindowFocus: (handler: () => void) => {
    const listener = () => {
      handler();
    };
    ipcRenderer.on('main-window-focus', listener);
    return () => {
      ipcRenderer.removeListener('main-window-focus', listener);
    };
  },
  openNewWindow: (relativePath?: string): Promise<void> =>
    ipcRenderer.invoke('shell-new-window', relativePath) as Promise<void>,
  pickProjectDirectory: (): Promise<{ path: string } | null> =>
    ipcRenderer.invoke('pick-project-directory') as Promise<{ path: string } | null>,
  setCodeProjectIndex: (payload: { projectId: string; rootPath: string } | null): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('set-code-project-index', payload) as Promise<{ ok: boolean }>,
  syncActiveEditor: (payload: {
    path: string;
    name: string;
    line: number;
    character: number;
    selection?: string;
  } | null): Promise<{ ok: boolean }> =>
    ipcRenderer.invoke('sync-active-editor', payload) as Promise<{ ok: boolean }>,
  runLocalDesktopTool: (
    payload: RunLocalPayload,
    options?: RunLocalOptions,
  ): Promise<{ ok: true; result: string; rawData?: any } | { ok: false; error: string }> => {
    const useStream =
      (payload.tool === 'run_command' || payload.tool === 'local_shell' || payload.tool === 'local_ollama_chat')
      && typeof options?.onShellStreamChunk === 'function';
    const shellStreamId = useStream && globalThis.crypto?.randomUUID
      ? globalThis.crypto.randomUUID()
      : useStream
        ? `shell-${Date.now()}-${Math.random().toString(36).slice(2, 11)}`
        : '';
    const channel = useStream ? `local-desktop-tool-chunk:${shellStreamId}` : '';

    const handler = (_event: unknown, data: { stream?: string; text?: string }) => {
      const stream = data.stream === 'stderr' ? 'stderr' : 'stdout';
      const text = typeof data.text === 'string' ? data.text : '';
      options?.onShellStreamChunk?.({ stream, text });
    };

    if (channel) {
      ipcRenderer.on(channel, handler);
    }

    const invokePayload = useStream
      ? { ...payload, shellStreamId }
      : payload;

    const p = ipcRenderer.invoke('local-desktop-tool', invokePayload) as Promise<
      { ok: true; result: string; rawData?: any } | { ok: false; error: string }
    >;

    if (channel) {
      return p.finally(() => {
        ipcRenderer.removeListener(channel, handler);
      });
    }
    return p;
  },

  // Search bridge — wraps FTS5-backed local file search
  searchFiles: (term: string, limit?: number) =>
    ipcRenderer.invoke('search:query', { term, limit }) as Promise<unknown[]>,
  searchStatus: () =>
    ipcRenderer.invoke('search:status') as Promise<{
      indexed: number;
      watching: boolean;
      lastRun: number;
      scan_in_progress?: boolean;
      queue_depth?: number;
      project_root?: string | null;
      health?: {
        indexer_ipc_reachable: boolean;
        db_integrity: string;
        last_error: string | null;
        queue_text_depth: number;
        queue_structure_depth: number;
      };
    }>,
  searchAigeniusIgnore: (payload: { rootPath: string }) =>
    ipcRenderer.invoke('search:aigeniusignore', payload) as Promise<{
      path?: string;
      content?: string;
      error?: boolean;
    }>,
  searchAigeniusIgnoreSave: (payload: { rootPath: string; content: string }) =>
    ipcRenderer.invoke('search:aigeniusignore', { ...payload, action: 'write' }) as Promise<{ ok?: boolean; error?: boolean }>,
  searchReindex: (payload: { paths?: string[]; force?: boolean }) =>
    ipcRenderer.invoke('search:reindex', payload) as Promise<{ queued: number }>,
  searchRemove: (filePath: string) =>
    ipcRenderer.invoke('search:remove', { path: filePath }) as Promise<{ ok: boolean }>,
  searchBrowse: (payload?: Record<string, unknown>) =>
    ipcRenderer.invoke('search:browse', payload ?? {}) as Promise<{
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
    }>,
  searchFolders: (payload?: Record<string, unknown>) =>
    ipcRenderer.invoke('search:folders', payload ?? {}) as Promise<{
      folders: Array<{ folderPath: string; fileCount: number; maxMtime: number }>;
      total: number;
      error?: boolean;
    }>,
  searchExplorer: (payload?: Record<string, unknown>) =>
    ipcRenderer.invoke('search:explorer', payload ?? {}) as Promise<{
      mode: 'root' | 'dir';
      currentDirectory: string;
      parentDirectory: string | null;
      breadcrumbPrefixes: string[];
      folders: Array<{
        folderPath: string;
        name: string;
        fileCountRecursive: number;
        maxMtime: number;
      }>;
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
    }>,
  searchRow: (filePath: string, maxContentChars?: number) =>
    ipcRenderer.invoke('search:row', { path: filePath, maxContentChars }) as Promise<
      | {
        path: string;
        name: string;
        mtime: number;
        extension: string;
        tags: string;
        content: string;
        contentTruncated: boolean;
        error?: string;
      }
      | { error: string }
    >,
  startWebSignIn: (): Promise<{ token: string } | null> =>
    ipcRenderer.invoke('web-signin') as Promise<{ token: string } | null>,
  openFile: (path: string): Promise<{ ok: boolean; error: string }> =>
    ipcRenderer.invoke('open-file-path', path) as Promise<{ ok: boolean; error: string }>,
  revealFileInFolder: (path: string): Promise<{ ok: boolean; error?: string }> =>
    ipcRenderer.invoke('reveal-file-path', path) as Promise<{ ok: boolean; error?: string }>,
  readLocalFilePreview: (
    path: string,
  ): Promise<
    | {
      ok: true;
      kind: 'image';
      mimeType: string;
      base64: string;
    }
    | {
      ok: true;
      kind: 'text';
      mimeType: string;
      text: string;
    }
    | { ok: false; error: string; maxBytes?: number }
  > => ipcRenderer.invoke('read-local-file-preview', path),
  captureWindowForChat: (): Promise<
    | { ok: true; base64: string; mimeType: string; basename: string }
    | { ok: false; error: string }
  > => ipcRenderer.invoke('capture-window-png-for-chat') as Promise<
    | { ok: true; base64: string; mimeType: string; basename: string }
    | { ok: false; error: string }
  >,
  onQueueChatScreenshot: (
    handler: (items: Array<{ base64: string; mimeType: string; basename: string }>) => void,
  ) => {
    const fn = (_event: unknown, raw: unknown): void => {
      if (!raw || typeof raw !== 'object') {
        return;
      }
      const batch = (raw as { batch?: unknown }).batch;
      if (!Array.isArray(batch) || batch.length === 0) {
        return;
      }
      handler(batch as Array<{ base64: string; mimeType: string; basename: string }>);
    };
    ipcRenderer.on(DESKTOP_QUEUE_CHAT_SCREENSHOT_CHAN, fn);
    return () => {
      ipcRenderer.removeListener(DESKTOP_QUEUE_CHAT_SCREENSHOT_CHAN, fn);
    };
  },
});

// Audio Recorder API
contextBridge.exposeInMainWorld('audioRecorder', {
  saveWithDialog: async (audioBuffer: Float32Array, sampleRate: number, fileName?: string) => {
    const audioArray = Array.from(audioBuffer);
    return ipcRenderer.invoke('audio:save-with-dialog', {
      audioBuffer: audioArray,
      sampleRate,
      fileName,
    }) as Promise<{ ok: true; filePath: string } | { ok: false; error: string }>;
  },

  saveToPath: async (audioBuffer: Float32Array, sampleRate: number, filePath: string) => {
    const audioArray = Array.from(audioBuffer);
    return ipcRenderer.invoke('audio:save-to-path', {
      audioBuffer: audioArray,
      sampleRate,
      filePath,
    }) as Promise<{ ok: true; filePath: string } | { ok: false; error: string }>;
  },
});

