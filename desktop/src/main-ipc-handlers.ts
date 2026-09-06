import {
  app,
  BrowserWindow,
  dialog,
  ipcMain,
  shell,
} from 'electron';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { loopbackHttpUrl } from './loopback-host';
import { MINI_SERVER_PORT } from './mini-server-port';
import { runLocalDesktopTool } from './local-tool-executor';
import { getChatRuntimeContextForIpc, USER_HOME_DIR_AT_STARTUP } from './chat-runtime-context';
import { getChatRuntimeContextCached } from './chat-runtime-context-cache';
import { fetchLocalSearchIndexState } from './local-search-index-state';
import { applySyncedToolPermissionPreferences } from './tool-permission-preferences';
import { setActiveCodeProjectIndex } from './active-code-project';
import { refreshProjectArchitectureMemory } from './project-architecture-memory';
import { setMainActiveEditor } from './active-editor-main';
import { saveLastCodeProject } from './last-code-project';
import {
  clearDesktopRefreshToken,
  readDesktopRefreshToken,
  storeDesktopRefreshToken,
} from './desktop-auth-store';
import { deliverOpenExternalOrAuthUrl } from './navigation-guards';
import {
  notifyChatCompletionIfBackground,
  type ChatCompletionNotifyPayload,
} from './chat-completion-notifications';
import {
  captureBrowserWindowPngBase64,
  defaultScreenshotBasename,
} from './main-chat-screenshot';
import { runDesktopBrowserSignIn } from './main-desktop-signin';
import { resolveUpstreamApiUrl } from './main-backend-lifecycle';
import { createWindow } from './main-window';
import { isHostedPaymentUrl } from './payment-allowlist';

function normalizeRendererFilesystemPath(filePath: string): string {
  let normalizedPath = filePath;
  if (process.platform === 'win32') {
    normalizedPath = filePath.replace(/\//g, '\\');
    if (normalizedPath.startsWith('\\') && /^[a-zA-Z]:/.test(normalizedPath.slice(1))) {
      normalizedPath = normalizedPath.slice(1);
    }
  }
  return normalizedPath;
}

export function registerMainIpcHandlers(): void {
  ipcMain.on('get-mini-server-port', (e) => {
    e.returnValue = MINI_SERVER_PORT;
  });

  ipcMain.on('open-external', (e, url: string) => {
    if (typeof url !== 'string' || (!url.startsWith('https:') && !url.startsWith('http:'))) {
      return;
    }
    if (deliverOpenExternalOrAuthUrl(e.sender, url)) {
      return;
    }
    if (isHostedPaymentUrl(url)) {
      void shell.openExternal(url);
      return;
    }
    const win = BrowserWindow.fromWebContents(e.sender);
    void (async () => {
      const { showExternalLinkApprovalDialog } = await import('./external-link-approval-dialog');
      const ok = await showExternalLinkApprovalDialog(win ?? undefined, url);
      if (ok) {
        void shell.openExternal(url);
      }
    })();
  });

  ipcMain.handle('open-file-path', async (_event, filePath: string) => {
    console.log('[aigenius-desktop][ipc] open-file-path:', filePath);
    if (typeof filePath !== 'string' || filePath.trim().length === 0) {
      return { ok: false as const, error: 'Invalid file path' };
    }
    const normalizedPath = normalizeRendererFilesystemPath(filePath.trim());
    const error = await shell.openPath(normalizedPath);
    if (error) {
      console.error('[aigenius-desktop][ipc] open-file-path error:', error);
    }
    return { ok: error === '', error };
  });

  ipcMain.handle('reveal-file-path', async (_event, filePath: string) => {
    if (typeof filePath !== 'string' || filePath.trim().length === 0) {
      return { ok: false as const, error: 'invalid' };
    }
    const normalizedPath = normalizeRendererFilesystemPath(filePath.trim());
    shell.showItemInFolder(normalizedPath);
    return { ok: true as const };
  });

  ipcMain.handle('read-local-file-preview', async (_event, filePath: string) => {
    const PREVIEW_IMAGE_MAX = 16 * 1024 * 1024;
    const PREVIEW_TEXT_MAX = 520 * 1024;
    const PROBE_UTF8_MAX = 400 * 1024;

    if (typeof filePath !== 'string' || filePath.trim().length === 0) {
      return { ok: false as const, error: 'invalid_path' };
    }
    const p = normalizeRendererFilesystemPath(filePath.trim());
    try {
      const st = await fs.promises.stat(p);
      if (!st.isFile()) {
        return { ok: false as const, error: 'not_a_file' };
      }
      const ext = path.extname(p).toLowerCase();

      const imageExt = new Set([
        '.png',
        '.jpg',
        '.jpeg',
        '.gif',
        '.webp',
        '.bmp',
        '.ico',
        '.avif',
      ]);
      const textExt = new Set([
        '.txt',
        '.md',
        '.json',
        '.csv',
        '.xml',
        '.tsx',
        '.ts',
        '.jsx',
        '.js',
        '.mjs',
        '.cjs',
        '.css',
        '.html',
        '.htm',
        '.yaml',
        '.yml',
        '.log',
        '.svg',
        '.toml',
        '.ini',
        '.sql',
        '.sh',
        '.ps1',
        '.py',
        '.java',
        '.rs',
        '.go',
        '.cpp',
        '.hpp',
        '.c',
        '.h',
        '.cs',
        '.php',
        '.rb',
        '.pl',
        '.pm',
        '.t',
        '.dockerfile',
        'Dockerfile',
        '.env',
        '.gitignore',
        '.prettierrc',
        '.eslintrc',
        '.editorconfig',
      ]);

      const isPdf = ext === '.pdf';
      if (imageExt.has(ext) || isPdf) {
        if (st.size > PREVIEW_IMAGE_MAX) {
          return { ok: false as const, error: 'too_large', maxBytes: PREVIEW_IMAGE_MAX };
        }
        const buf = await fs.promises.readFile(p);
        const mimeType =
          ext === '.png'
            ? 'image/png'
            : ext === '.jpg' || ext === '.jpeg'
              ? 'image/jpeg'
              : ext === '.gif'
                ? 'image/gif'
                : ext === '.webp'
                  ? 'image/webp'
                  : ext === '.bmp'
                    ? 'image/bmp'
                    : ext === '.ico'
                      ? 'image/x-icon'
                      : ext === '.avif'
                        ? 'image/avif'
                        : ext === '.pdf'
                          ? 'application/pdf'
                          : 'application/octet-stream';
        return {
          ok: true as const,
          kind: 'image' as const,
          mimeType,
          base64: buf.toString('base64'),
        };
      }

      const allowTextByExt = textExt.has(ext);
      const allowSmallProbe = st.size <= PROBE_UTF8_MAX;
      if (allowTextByExt || allowSmallProbe) {
        if (st.size > PREVIEW_TEXT_MAX) {
          return { ok: false as const, error: 'too_large', maxBytes: PREVIEW_TEXT_MAX };
        }
        const buf = await fs.promises.readFile(p);
        const text = buf.toString('utf8');
        return {
          ok: true as const,
          kind: 'text' as const,
          mimeType: 'text/plain; charset=utf-8',
          text,
        };
      }

      return { ok: true as const, kind: 'binary' as const, mimeType: 'application/octet-stream', size: st.size };
    } catch (err) {
      console.error('[aigenius-desktop][ipc] read-local-file-preview failed', err);
      return { ok: false as const, error: 'io_error' };
    }
  });

  ipcMain.handle('get-local-search-index-state', async () => fetchLocalSearchIndexState());

  ipcMain.handle('get-chat-runtime-context', async () => {
    try {
      return await getChatRuntimeContextCached(getChatRuntimeContextForIpc);
    } catch (err) {
      console.error('[aigenius-desktop][ipc] get-chat-runtime-context failed', err);
      return {
        desktopHost: {
          platform: process.platform,
          arch: process.arch,
          release: os.release(),
          userHomeDir: USER_HOME_DIR_AT_STARTUP,
        },
        retrievalMemoryCatalog: {
          generatedAtIso: new Date().toISOString(),
          entries: [],
        },
      };
    }
  });

  ipcMain.handle('tool-permissions:sync', async (_event, prefs: unknown) => {
    return applySyncedToolPermissionPreferences(prefs);
  });

  ipcMain.handle('pick-project-directory', async () => {
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    const result = await dialog.showOpenDialog(win, {
      properties: ['openDirectory'],
      title: 'Select project folder',
    });
    if (result.canceled || !result.filePaths[0]) {
      return null;
    }
    return { path: result.filePaths[0] };
  });

  ipcMain.handle('sync-active-editor', (_event, payload: unknown) => {
    if (!payload || typeof payload !== 'object') {
      setMainActiveEditor(null);
      return { ok: true };
    }
    const p = payload as Record<string, unknown>;
    const filePath = typeof p.path === 'string' ? p.path : '';
    if (!filePath) {
      setMainActiveEditor(null);
      return { ok: true };
    }
    setMainActiveEditor({
      path: filePath,
      name: typeof p.name === 'string' ? p.name : path.basename(filePath),
      line: typeof p.line === 'number' ? p.line : 1,
      character: typeof p.character === 'number' ? p.character : 1,
      selection: typeof p.selection === 'string' ? p.selection : undefined,
    });
    return { ok: true };
  });

  ipcMain.handle(
    'set-code-project-index',
    async (_event, payload: { projectId: string; rootPath: string } | null) => {
      setActiveCodeProjectIndex(payload);
      if (!payload?.rootPath) {
        return { ok: true };
      }

      saveLastCodeProject(app.getPath('userData'), {
        projectId: payload.projectId,
        rootPath: payload.rootPath,
      });

      try {
        const port = MINI_SERVER_PORT;
        const token = process.env.AIGENIUS_SECRET_TOKEN;
        if (!token) {
          console.warn('[aigenius-desktop] set-code-project-index: missing AIGENIUS_SECRET_TOKEN');
          return { ok: false, error: 'missing_secret_token' };
        }

        const switchRes = await fetch(loopbackHttpUrl(port, '/search/switch-project'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            projectId: payload.projectId,
            rootPath: payload.rootPath,
          }),
        });
        if (!switchRes.ok) {
          console.warn('[aigenius-desktop] switch-project returned', switchRes.status);
          return { ok: false, error: `switch-project:${switchRes.status}` };
        }

        const res = await fetch(loopbackHttpUrl(port, '/search/index-project'), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ rootPath: payload.rootPath, force: false }),
        });
        if (!res.ok) {
          console.warn('[aigenius-desktop] index-project returned', res.status);
          return { ok: false, error: `index-project:${res.status}` };
        }

        if (payload.projectId) {
          refreshProjectArchitectureMemory(
            payload.projectId,
            payload.rootPath,
            path.basename(payload.rootPath) || payload.projectId,
          );
        }

        return { ok: true };
      } catch (err) {
        console.warn('[aigenius-desktop] index-project failed', err);
        return {
          ok: false,
          error: err instanceof Error ? err.message : 'index-project_failed',
        };
      }
    },
  );

  ipcMain.handle(
    'local-desktop-tool',
    async (
      event,
      payload: { tool?: string; arguments?: Record<string, unknown>; shellStreamId?: string },
    ) => {
      if (!payload || typeof payload.tool !== 'string') {
        return { ok: false as const, error: 'Invalid tool payload' };
      }
      const shellStreamId =
        (payload.tool === 'run_command' || payload.tool === 'local_shell' || payload.tool === 'local_ollama_chat') &&
          typeof payload.shellStreamId === 'string' &&
          payload.shellStreamId.length > 0
          ? payload.shellStreamId
          : undefined;
      return runLocalDesktopTool(event.sender, payload.tool, payload.arguments ?? {}, shellStreamId);
    },
  );

  ipcMain.handle('get-upstream-api-url', async () => resolveUpstreamApiUrl());

  ipcMain.handle('get-desktop-refresh-token', async () => readDesktopRefreshToken());
  ipcMain.handle('set-desktop-refresh-token', async (_event, token: unknown) => {
    if (typeof token !== 'string' || token.trim().length === 0) {
      clearDesktopRefreshToken();
      return { ok: false as const };
    }
    const result = storeDesktopRefreshToken(token);
    return result;
  });
  ipcMain.handle('clear-desktop-auth-secrets', async () => {
    clearDesktopRefreshToken();
    return { ok: true as const };
  });

  ipcMain.handle('web-signin', async (event) => runDesktopBrowserSignIn(event));
  ipcMain.handle('start-oauth-signin', async (event, options?: { provider?: 'google' }) =>
    runDesktopBrowserSignIn(event, options?.provider === 'google' ? { autoProvider: 'google' } : {}),
  );

  ipcMain.handle('shell-new-window', async (_event, relativePath?: string) => {
    const w = createWindow(relativePath);
    w.focus();
  });

  ipcMain.handle('chat-completion-notify', (event, payload: unknown) => {
    if (!payload || typeof payload !== 'object') {
      return { notified: false };
    }
    const { modelName, preview } = payload as ChatCompletionNotifyPayload;
    if (typeof preview !== 'string') {
      return { notified: false };
    }
    return notifyChatCompletionIfBackground(event.sender, {
      modelName: typeof modelName === 'string' ? modelName : undefined,
      preview,
    });
  });

  ipcMain.handle('capture-window-png-for-chat', async (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) {
      return { ok: false as const, error: 'No window' };
    }
    const cap = await captureBrowserWindowPngBase64(win);
    if ('error' in cap) {
      return { ok: false as const, error: cap.error };
    }
    return {
      ok: true as const,
      base64: cap.base64,
      mimeType: 'image/png',
      basename: defaultScreenshotBasename(),
    };
  });

}
