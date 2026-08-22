// .env loading is dev-only; packaged apps don't ship dotenv (devDependency).
if (!__filename.includes('app.asar')) {
  require('dotenv/config');
}

import { attachStdioEpipeHandlers } from './stdio-safe';
import {
  installDesktopPerfInstrumentation,
  startupMark,
} from './perf';
import { registerDesktopUiPrivilegedScheme } from './desktop-ui-protocol';

attachStdioEpipeHandlers();
installDesktopPerfInstrumentation();
registerDesktopUiPrivilegedScheme();

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
  session,
} from 'electron';
import {
  loadToolPermissionPreferences,
} from './tool-permission-preferences';
import { initLocalRetrievalMemory } from './local-retrieval-memory';
import { registerIpcHandlers } from './search';
import { setupCrashHandlers } from './crash-handler';
import { checkInotifyLimit } from './utils/sys-limits';
import { setActiveCodeProjectIndex } from './active-code-project';
import { loadLastCodeProject } from './last-code-project';
import {
  configureDesktopNotificationBranding,
  setChatCompletionNotificationIcon,
} from './chat-completion-notifications';
import {
  attachFullDesktopToChatShell,
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
  desktopUiStaticDir,
} from './main-backend-lifecycle';
import { createWindow, getWindowIcon, navigateMainShellToApp, resolveWindowIconPath } from './main-window';
import { registerMainIpcHandlers } from './main-ipc-handlers';
import { installDesktopUiProtocolHandler } from './desktop-ui-protocol';

function showInotifyWarningAsync(): void {
  const limitCheck = checkInotifyLimit();
  if (!limitCheck || limitCheck.isSufficient) {
    return;
  }
  void (async () => {
    const { clipboard } = await import('electron');
    const choice = await dialog.showMessageBox({
      type: 'warning',
      title: 'System Limit Warning',
      message: `Your system's file watcher limit (inotify) is too low (${limitCheck.currentValue}).`,
      detail: `The AIGenius search engine needs to watch more files than the system allows. This can cause search to fail or the app to crash.\n\nRecommended: ${limitCheck.recommendedValue}\n\nWould you like to copy the fix command to your clipboard?`,
      buttons: ['Copy & Close', 'Ignore'],
      defaultId: 0,
    });
    if (choice.response === 0) {
      clipboard.writeText(limitCheck.fixCommand);
    }
  })();
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

    showInotifyWarningAsync();

    const iconPathForDock = resolveWindowIconPath();
    const appIcon = getWindowIcon();
    setChatCompletionNotificationIcon(appIcon ?? iconPathForDock);
    if (iconPathForDock && process.platform === 'darwin' && app.dock) {
      try {
        app.dock.setIcon(iconPathForDock);
      } catch {
        /* ignore */
      }
    }

    await installDesktopUiProtocolHandler(desktopUiStaticDir());

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

    const mainWindow = createWindow({ deferAppLoad: true });

    try {
      await startBackendProcesses();
    } catch (err) {
      console.error(err);
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

    const { registerAudioRecorderHandlers } = await import('./audio-recorder-handler');
    registerAudioRecorderHandlers();
    startupMark('ipc_handlers_registered');

    await navigateMainShellToApp(mainWindow);

    const registeredGlobalShot = globalShortcut.register(CHAT_SCREENSHOT_GLOBAL_ACCELERATOR, () => {
      void attachFullDesktopToChatShell(null);
    });
    if (!registeredGlobalShot) {
      console.warn(
        '[aigenius-desktop] Could not register global screenshot shortcut (in use by the OS or another app):',
        CHAT_SCREENSHOT_GLOBAL_ACCELERATOR,
      );
    }

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) {
        createWindow();
      }
    });

    session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
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
