import {
  app,
  BrowserWindow,
  clipboard,
  dialog,
  ipcMain,
  nativeImage,
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
  runCreateNamedProjectDirectoryRequest,
  runCreateNamedProjectDirectorySilent,
} from './create-named-project-folder';
import {
  clearDesktopRefreshToken,
  readDesktopRefreshToken,
  storeDesktopRefreshToken,
} from './desktop-auth-store';
import {
  openClickedHttpUrlInSystemBrowser,
  openUrlInSystemBrowser,
  openWalletCheckoutInSystemBrowser,
} from './open-url-in-system-browser';
import {
  notifyChatCompletionIfBackground,
  type ChatCompletionNotifyPayload,
} from './chat-completion-notifications';
import {
  captureBrowserWindowPngBase64,
  defaultScreenshotBasename,
} from './main-chat-screenshot';
import { cancelDesktopBrowserSignIn, runDesktopBrowserSignIn } from './main-desktop-signin';
import { resolveUpstreamApiUrl } from './main-backend-lifecycle';
import { createWindow } from './main-window';
import { revealPathInFileManager } from './reveal-path-in-file-manager';
import { copyItemToOsClipboard } from './copy-item-to-os-clipboard';
import { pathToFileURL } from 'url';

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

  ipcMain.on('get-stt-enabled', (e) => {
    e.returnValue = (process.env.AIGENIUS_ENABLE_STT ?? '0') !== '0';
  });

  ipcMain.handle('open-wallet-checkout-url', async (_event, url: string) => {
    return openWalletCheckoutInSystemBrowser(url);
  });

  ipcMain.handle('open-external-url', async (event, url: string) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return openUrlInSystemBrowser(url, win ?? undefined);
  });

  ipcMain.handle('open-clicked-http-url', async (_event, url: string) => {
    return openClickedHttpUrlInSystemBrowser(url);
  });

  ipcMain.on('open-external', (e, url: string) => {
    const win = BrowserWindow.fromWebContents(e.sender);
    void openUrlInSystemBrowser(url, win ?? undefined);
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
    return revealPathInFileManager(normalizedPath, {
      electronFallback: (p) => {
        shell.showItemInFolder(p);
      },
    });
  });

  ipcMain.handle('copy-file-path', async (_event, filePath: string) => {
    if (typeof filePath !== 'string' || filePath.trim().length === 0) {
      return { ok: false as const, error: 'invalid' };
    }
    const normalizedPath = normalizeRendererFilesystemPath(filePath.trim());
    return copyItemToOsClipboard(normalizedPath, {
      electronWriteFiles: (p) => {
        if (process.platform !== 'darwin') {
          throw new Error('native file clipboard is macOS-only here');
        }
        clipboard.writeBuffer('public.file-url', Buffer.from(pathToFileURL(p).href));
      },
      writeText: (p) => {
        clipboard.writeText(p);
      },
    });
  });

  ipcMain.handle('copy-text', async (_event, text: string) => {
    try {
      if (typeof text === 'string') {
        clipboard.writeText(text);
        return { ok: true as const };
      }
      return { ok: false as const, error: 'invalid' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'failed';
      return { ok: false as const, error: message };
    }
  });

  ipcMain.handle('copy-image-to-clipboard', async (_event, payload: { dataUrl?: string; filePath?: string }) => {
    try {
      if (payload?.filePath && typeof payload.filePath === 'string' && payload.filePath.trim().length > 0) {
        const normalized = normalizeRendererFilesystemPath(payload.filePath.trim());
        const img = nativeImage.createFromPath(normalized);
        if (!img.isEmpty()) {
          clipboard.writeImage(img);
          try {
            await copyItemToOsClipboard(normalized, {
              electronWriteFiles: (p) => {
                if (process.platform === 'darwin') {
                  clipboard.writeBuffer('public.file-url', Buffer.from(pathToFileURL(p).href));
                }
              },
              writeText: () => {},
            });
          } catch {
            // ignore file path clipboard error, image bitmap is already copied
          }
          return { ok: true as const };
        }
      }

      if (payload?.dataUrl && typeof payload.dataUrl === 'string' && payload.dataUrl.trim().length > 0) {
        const img = nativeImage.createFromDataURL(payload.dataUrl);
        if (!img.isEmpty()) {
          clipboard.writeImage(img);
          try {
            const tempDir = os.tmpdir();
            const tempFile = path.join(tempDir, `aigenius-image-${Date.now()}.png`);
            await fs.promises.writeFile(tempFile, img.toPNG());
            await copyItemToOsClipboard(tempFile, {
              electronWriteFiles: (p) => {
                if (process.platform === 'darwin') {
                  clipboard.writeBuffer('public.file-url', Buffer.from(pathToFileURL(p).href));
                }
              },
              writeText: () => {},
            });
          } catch {
            // ignore temp file write error, image bitmap is already copied
          }
          return { ok: true as const };
        }
      }

      return { ok: false as const, error: 'empty_image' };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'failed';
      return { ok: false as const, error: message };
    }
  });

  ipcMain.handle('read-local-file-preview', async (_event, filePath: string) => {
    const PREVIEW_IMAGE_MAX = 16 * 1024 * 1024;
    const PREVIEW_MEDIA_MAX = 128 * 1024 * 1024;
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

      const videoExt = new Set([
        '.mp4',
        '.webm',
        '.ogg',
        '.ogv',
        '.mov',
        '.m4v',
        '.mkv',
        '.avi',
        '.wmv',
        '.flv',
        '.3gp',
        '.ts',
        '.m3u8',
      ]);
      const audioExt = new Set(['.mp3', '.wav', '.m4a', '.aac', '.flac', '.opus', '.oga']);

      const mediaMime = (mediaExt: string): string => {
        switch (mediaExt) {
          case '.mp4':
          case '.m4v':
            return 'video/mp4';
          case '.webm':
            return 'video/webm';
          case '.ogg':
          case '.ogv':
            return 'video/ogg';
          case '.mov':
            return 'video/quicktime';
          case '.mkv':
            return 'video/x-matroska';
          case '.avi':
            return 'video/x-msvideo';
          case '.wmv':
            return 'video/x-ms-wmv';
          case '.flv':
            return 'video/x-flv';
          case '.3gp':
            return 'video/3gpp';
          case '.ts':
            return 'video/mp2t';
          case '.m3u8':
            return 'application/vnd.apple.mpegurl';
          case '.mp3':
            return 'audio/mpeg';
          case '.wav':
            return 'audio/wav';
          case '.m4a':
            return 'audio/mp4';
          case '.aac':
            return 'audio/aac';
          case '.flac':
            return 'audio/flac';
          case '.opus':
            return 'audio/opus';
          case '.oga':
            return 'audio/ogg';
          default:
            return 'application/octet-stream';
        }
      };

      if (videoExt.has(ext) || audioExt.has(ext)) {
        if (st.size > PREVIEW_MEDIA_MAX) {
          return { ok: false as const, error: 'too_large', maxBytes: PREVIEW_MEDIA_MAX };
        }
        const buf = await fs.promises.readFile(p);
        const kind = audioExt.has(ext) ? ('audio' as const) : ('video' as const);
        return {
          ok: true as const,
          kind,
          mimeType: mediaMime(ext),
          base64: buf.toString('base64'),
        };
      }

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

  ipcMain.handle('create-named-project-directory', async (_event, payload: unknown) => {
    const folderName =
      payload && typeof payload === 'object' && 'folderName' in payload
        ? (payload as { folderName: unknown }).folderName
        : '';
    const silent =
      payload && typeof payload === 'object' && 'silent' in payload
        ? (payload as { silent?: unknown }).silent === true
        : false;
    const documentsPath = app.getPath('documents');
    if (silent) {
      return runCreateNamedProjectDirectorySilent({
        folderName,
        documentsPath,
      });
    }
    const win = BrowserWindow.getFocusedWindow() ?? BrowserWindow.getAllWindows()[0];
    return runCreateNamedProjectDirectoryRequest({
      folderName,
      documentsPath,
      showOpenDialog: (options) => dialog.showOpenDialog(win, options),
    });
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
  ipcMain.handle('start-oauth-signin', async (event, options?: { provider?: 'google' | 'dev', email?: string }) =>
    runDesktopBrowserSignIn(event, options?.provider ? { autoProvider: options.provider, email: options.email } : {}),
  );
  ipcMain.handle('cancel-web-signin', async () => ({ ok: cancelDesktopBrowserSignIn() }));

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

  // Custom window controls for frameless windows (Windows / Linux).
  ipcMain.on('window-minimize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.minimize();
    }
  });

  ipcMain.on('window-maximize', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) {
      return;
    }
    const next = !win.isMaximized();
    if (win.isMaximized()) {
      win.unmaximize();
    } else {
      win.maximize();
    }
    // Notify renderer of the new state after the OS has applied it.
    setImmediate(() => {
      if (!win.isDestroyed()) {
        win.webContents.send('window-maximize-change', next);
      }
    });
  });

  ipcMain.on('window-close', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed()) {
      win.close();
    }
  });

  ipcMain.handle('window-is-maximized', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win && !win.isDestroyed() ? win.isMaximized() : false;
  });

  ipcMain.on('window-set-opacity', (event, opacity: number) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (win && !win.isDestroyed() && typeof opacity === 'number') {
      const clamped = Math.max(0.15, Math.min(1.0, opacity));
      win.setOpacity(clamped);
      win.webContents.send('window-opacity-change', clamped);
    }
  });

  ipcMain.handle('window-get-opacity', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    return win && !win.isDestroyed() ? win.getOpacity() : 1.0;
  });

  ipcMain.handle('window-toggle-opacity', (event) => {
    const win = BrowserWindow.fromWebContents(event.sender);
    if (!win || win.isDestroyed()) {
      return 1.0;
    }
    const current = win.getOpacity();
    const next = current < 0.95 ? 1.0 : 0.7;
    win.setOpacity(next);
    win.webContents.send('window-opacity-change', next);
    return next;
  });
}
