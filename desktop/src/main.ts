// .env loading is dev-only; packaged apps don't ship dotenv (devDependency).
if (!__filename.includes('app.asar')) {
  require('dotenv/config');
}

import { attachStdioEpipeHandlers, safeStdioWrite } from './stdio-safe';
import {
  installDesktopPerfInstrumentation,
  isDesktopPerfBenchmarkEnabled,
  isDesktopPerfEnabled,
  maybeRunPerfBenchmark,
  startupMark,
  startupMarkSummary,
} from './perf';

attachStdioEpipeHandlers();
installDesktopPerfInstrumentation();

if (!process.env.NODE_ENV) {
  process.env.NODE_ENV = 'production';
}

/** Desktop shell defaults — override via env when packaging or in dev. */
if (process.env.AIGENIUS_ENABLE_STT === undefined) {
  process.env.AIGENIUS_ENABLE_STT = '0';
}
if (process.env.AIGENIUS_HOMEDIR_INDEX === undefined) {
  process.env.AIGENIUS_HOMEDIR_INDEX = '0';
}

import {
  app,
  BrowserWindow,
  dialog,
  globalShortcut,
  ipcMain,
  nativeImage,
  screen,
  shell,
  session,
} from 'electron';
import { runLocalDesktopTool } from './local-tool-executor';
import { getChatRuntimeContextForIpc, USER_HOME_DIR_AT_STARTUP } from './chat-runtime-context';
import { fetchLocalSearchIndexState } from './local-search-index-state';
import {
  loadToolPermissionPreferences,
  applySyncedToolPermissionPreferences,
} from './tool-permission-preferences';
import { initLocalRetrievalMemory } from './local-retrieval-memory';
import { attachMainShellNavigationGuards, deliverOpenExternalOrAuthUrl } from './navigation-guards';
import { mainShellBrowserWindowOptions } from './shell-chrome';
import { registerIpcHandlers } from './search';
import { registerAudioRecorderHandlers } from './audio-recorder-handler';
import { setupCrashHandlers } from './crash-handler';
import { checkInotifyLimit } from './utils/sys-limits';
import fs from 'fs';
import path from 'path';
import http from 'http';
import os from 'os';
import crypto from 'crypto';
import { resolveFrontendPort } from './frontend-port';
import { DEV_LOOPBACK_HOST, loopbackHttpUrl } from './loopback-host';
import { resolveUpstreamApiUrl as resolveDesktopUpstreamApiUrl } from './resolve-upstream-api-url';
import { setActiveCodeProjectIndex } from './active-code-project';
import { refreshProjectArchitectureMemory } from './project-architecture-memory';
import { setMainActiveEditor } from './active-editor-main';
import { startIndexerUtilityProcess, stopIndexerUtilityProcess } from './indexer-utility-process';
import {
  killManagedDesktopChild,
  spawnDesktopChild,
  type ManagedDesktopChild,
} from './desktop-child-process';
import { exchangeDesktopOAuthCode } from './desktop-auth-exchange';
import {
  clearDesktopRefreshToken,
  readDesktopRefreshToken,
  storeDesktopRefreshToken,
} from './desktop-auth-store';
import { saveLastCodeProject, loadLastCodeProject } from './last-code-project';
import { MINI_SERVER_PORT } from './mini-server-port';
import net from 'net';
import {
  attachChatCompletionWindowFocusHandlers,
  configureDesktopNotificationBranding,
  notifyChatCompletionIfBackground,
  setChatCompletionNotificationIcon,
  type ChatCompletionNotifyPayload,
} from './chat-completion-notifications';
import { setLastFocusedMainShellWindow } from './main-shell-focus';
import {
  captureBrowserWindowPngBase64,
  defaultScreenshotBasename,
  attachFullDesktopToChatShell,
  DESKTOP_QUEUE_CHAT_SCREENSHOT_CHAN,
} from './main-chat-screenshot';
import { createApplicationMenu } from './main-application-menu';

import { CHAT_SCREENSHOT_GLOBAL_ACCELERATOR } from './main-chat-screenshot';
import { DESKTOP_BRIDGE_DEBUG } from './main-devtools';
import {
  shutdownDesktopApp,
  startBackendProcesses,
  markAppShutdownStarted,
  isAppShutdownStarted,
  FRONTEND_PORT,
  FRONTEND_URL,
} from './main-backend-lifecycle';
import { createWindow, getWindowIcon, resolveWindowIconPath } from './main-window';
import { registerMainIpcHandlers } from './main-ipc-handlers';

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

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
  if (DESKTOP_BRIDGE_DEBUG) {
    console.info(
      '[aigenius-desktop][bridge-debug] exit: another instance holds requestSingleInstanceLock()',
    );
  }
  app.quit();
} else {
  configureDesktopNotificationBranding();

  if (DESKTOP_BRIDGE_DEBUG) {
    console.info('[aigenius-desktop][bridge-debug] main: got single-instance lock');
  }
  app.on('second-instance', () => {
    const w = BrowserWindow.getAllWindows()[0];
    if (w) {
      if (w.isMinimized()) {
        w.restore();
      }
      w.focus();
    }
  });

  app.on('before-quit', (event) => {
    if (isAppShutdownStarted()) {
      return;
    }
    event.preventDefault();
    markAppShutdownStarted();

    const forceExitTimer = setTimeout(() => {
      console.warn('[aigenius-desktop] Shutdown timed out; forcing exit');
      app.exit(0);
    }, 5000);

    void (async () => {
      try {
        await shutdownDesktopApp();
      } finally {
        clearTimeout(forceExitTimer);
        app.quit();
      }
    })();
  });

  registerMainIpcHandlers();


  app.whenReady().then(async () => {
    startupMark('app_when_ready');
    createApplicationMenu({
      frontendPort: FRONTEND_PORT,
      createWindow,
      attachFullDesktopToChatShell,
    });

    // Check system limits (Linux only)
    const limitCheck = checkInotifyLimit();
    if (limitCheck && !limitCheck.isSufficient) {
      const { dialog, clipboard } = await import('electron');
      const choice = dialog.showMessageBoxSync({
        type: 'warning',
        title: 'System Limit Warning',
        message: `Your system's file watcher limit (inotify) is too low (${limitCheck.currentValue}).`,
        detail: `The AIGenius search engine needs to watch more files than the system allows. This can cause search to fail or the app to crash.\n\nRecommended: ${limitCheck.recommendedValue}\n\nWould you like to copy the fix command to your clipboard?`,
        buttons: ['Copy & Close', 'Ignore'],
        defaultId: 0,
      });

      if (choice === 0) {
        clipboard.writeText(limitCheck.fixCommand);
      }
    }

    const iconPathForDock = resolveWindowIconPath();
    const appIcon = getWindowIcon();
    setChatCompletionNotificationIcon(appIcon ?? iconPathForDock);
    if (iconPathForDock && process.platform === 'darwin') {
      try {
        app.dock.setIcon(iconPathForDock);
      } catch {
        /* ignore */
      }
    }

    try {
      await startBackendProcesses();
    } catch (err) {
      console.error(err);
      const { dialog } = await import('electron');
      await dialog.showErrorBox(
        'AIGenius',
        app.isPackaged
          ? `Could not start the local app server.\n\n${String(err)}`
          : [
            'Development: the mini-server or the Next UI is not ready.',
            '',
            `Terminal 1 (leave running): cd frontend && npx next dev -p ${FRONTEND_PORT}`,
            `Terminal 2: cd desktop && npm run dev`,
            '',
            `(After the first successful setup you can use npm run dev:quick in desktop/ if desktop-server is already built.)`,
            '',
            String(err),
          ].join('\n'),
      );
      app.quit();
      return;
    }
    startupMark('backend_processes_ready');

    // Setup crash handlers
    setupCrashHandlers();

    initLocalRetrievalMemory(app.getPath('userData'));
    const lastProject = loadLastCodeProject(app.getPath('userData'));
    if (lastProject?.projectId && lastProject?.rootPath) {
      setActiveCodeProjectIndex({
        projectId: lastProject.projectId,
        rootPath: lastProject.rootPath,
      });
    }
    await loadToolPermissionPreferences();
    registerIpcHandlers();
    registerAudioRecorderHandlers();
    startupMark('ipc_handlers_registered');

    const registeredGlobalShot = globalShortcut.register(CHAT_SCREENSHOT_GLOBAL_ACCELERATOR, () => {
      void attachFullDesktopToChatShell(null);
    });
    if (!registeredGlobalShot) {
      console.warn(
        '[aigenius-desktop] Could not register global screenshot shortcut (in use by the OS or another app):',
        CHAT_SCREENSHOT_GLOBAL_ACCELERATOR,
      );
    }

    createWindow();

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });

    // Handle microphone/camera permission requests in Electron shell
    session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
      const allowed = ['media', 'audioCapture', 'notifications'];
      if (allowed.includes(permission)) {
        return callback(true);
      }
      callback(false);
    });
  });

  app.on('window-all-closed', () => {
    app.quit();
  });

  app.on('will-quit', () => {
    globalShortcut.unregisterAll();
  });
}
