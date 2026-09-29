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
        {
          label: 'Toggle Opacity (Peek-through)',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => {
            const win = BrowserWindow.getFocusedWindow();
            if (!win || win.isDestroyed()) return;
            const current = win.getOpacity();
            const next = current < 0.95 ? 1.0 : 0.7;
            win.setOpacity(next);
            win.webContents.send('window-opacity-change', next);
          },
        },
        { type: 'separator' },
        { role: 'toggleDevTools' },
      ],
    },
    {
      label: 'AIGenius',
      submenu: [
        { label: 'About AIGenius', click: () => void shell.openExternal('https://aigenius.noboxlabs.xyz') },
        { label: 'Website', click: () => void shell.openExternal('https://aigenius.noboxlabs.xyz') },
        { type: 'separator' },
        { label: 'Contact Support', click: () => void shell.openExternal('mailto:nobox.hq@gmail.com?subject=AIGenius%20Desktop%20Support') },
        { label: 'Terms of Service', click: () => void shell.openExternal('https://aigenius.noboxlabs.xyz/docs/terms-and-conditions') },
        { label: 'Privacy Policy', click: () => void shell.openExternal('https://aigenius.noboxlabs.xyz/docs/privacy-policy') },
        { type: 'separator' },
        { label: 'Settings', enabled: false },
        { type: 'separator' },
        { role: 'quit' },
      ],
    },
    {
      role: 'help',
      submenu: [
        {
          label: 'Contact Support & Report Issue',
          click: () => void shell.openExternal('mailto:nobox.hq@gmail.com?subject=AIGenius%20Desktop%20Issue%20Report'),
        },
        { type: 'separator' },
        {
          label: 'AIGenius Website',
          click: () => void shell.openExternal('https://aigenius.noboxlabs.xyz'),
        },
        {
          label: 'Terms of Service',
          click: () => void shell.openExternal('https://aigenius.noboxlabs.xyz/docs/terms-and-conditions'),
        },
        {
          label: 'Privacy Policy',
          click: () => void shell.openExternal('https://aigenius.noboxlabs.xyz/docs/privacy-policy'),
        },
      ],
    },
  ];
  Menu.setApplicationMenu(Menu.buildFromTemplate(template));
}
