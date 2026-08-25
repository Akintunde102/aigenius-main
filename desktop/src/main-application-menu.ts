import { BrowserWindow, Menu, shell } from 'electron';
import { loopbackHttpUrl } from './loopback-host';
import { attachFullDesktopToChatShell } from './main-chat-screenshot';

export function createApplicationMenu(opts: {
  frontendPort: string | number;
  createWindow: (relativePath?: string) => BrowserWindow;
  attachFullDesktopToChatShell: typeof attachFullDesktopToChatShell;
}): void {
  const { frontendPort, createWindow, attachFullDesktopToChatShell: attachDesktop } = opts;
  const template: Electron.MenuItemConstructorOptions[] = [
    {
      label: 'File',
      submenu: [
        {
          label: 'New Window',
          accelerator: 'CmdOrCtrl+N',
          click: () => {
            const w = createWindow();
            w.focus();
          },
        },
        { type: 'separator' },
        { role: 'close' },
      ],
    },
    { role: 'editMenu' },
    {
      label: 'View',
      submenu: [
        { role: 'reload' },
        { type: 'separator' },
        {
          label: 'Capture Full Desktop to Chat',
          click: () => {
            void attachDesktop(BrowserWindow.getFocusedWindow() ?? undefined);
          },
        },
        { type: 'separator' },
        {
          label: 'Local Search Index',
          click: () => {
            const w =
              BrowserWindow.getFocusedWindow() ??
              BrowserWindow.getAllWindows().find((x) => !x.isDestroyed());
            if (!w || w.isDestroyed()) return;
            try {
              void w.loadURL(loopbackHttpUrl(frontendPort, '/desktop-search-index'));
            } catch (err) {
              console.error('[aigenius-desktop] Open Local Search Index failed:', err);
            }
          },
        },
        { type: 'separator' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'AIGenius',
      submenu: [
        { label: 'About', click: () => void shell.openExternal('https://aigenius.noboxlabs.xyz') },
        { type: 'separator' },
        { label: 'Settings', enabled: false },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
