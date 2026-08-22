import { app } from 'electron';

const SCHEME = 'aigenius';

/** Packaged Vite UI via `aigenius://app` — no localhost UI child process. Set `AIGENIUS_DESKTOP_UI_PROTOCOL=0` to use HTTP static server. */
export function shouldUseDesktopUiCustomProtocol(): boolean {
  if (!app.isPackaged) {
    return false;
  }
  return process.env.AIGENIUS_DESKTOP_UI_PROTOCOL !== '0';
}

export function desktopUiAppUrl(relativePath = '/desktop-login'): string {
  const pathPart = relativePath.startsWith('/') ? relativePath : `/${relativePath}`;
  return `${SCHEME}://app${pathPart}?aigenius_shell=1`;
}

export const DESKTOP_UI_SCHEME = SCHEME;
