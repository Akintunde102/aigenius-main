import { app, net, protocol } from 'electron';
import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

import { DESKTOP_UI_SCHEME, shouldUseDesktopUiCustomProtocol } from './desktop-ui-mode';

let protocolRegistered = false;
let protocolHandlerInstalled = false;

/** Must run before `app.whenReady()`. */
export function registerDesktopUiPrivilegedScheme(): void {
  if (protocolRegistered) {
    return;
  }
  protocolRegistered = true;
  protocol.registerSchemesAsPrivileged([
    {
      scheme: DESKTOP_UI_SCHEME,
      privileges: {
        standard: true,
        secure: true,
        supportFetchAPI: true,
        corsEnabled: true,
      },
    },
  ]);
}

function resolveSafeStaticFile(root: string, requestPath: string): string | null {
  const decoded = decodeURIComponent(requestPath.split('?')[0] || '/');
  const relPath = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  const filePath = path.join(root, relPath);
  const relative = path.relative(root, filePath);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    return null;
  }
  if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
    return filePath;
  }
  const spaFallback = path.join(root, 'index.html');
  if (fs.existsSync(spaFallback)) {
    return spaFallback;
  }
  return null;
}

export async function installDesktopUiProtocolHandler(staticRoot: string): Promise<void> {
  if (protocolHandlerInstalled || !shouldUseDesktopUiCustomProtocol()) {
    return;
  }
  if (!fs.existsSync(staticRoot)) {
    console.warn('[aigenius-desktop] desktop-ui static root missing; custom protocol disabled:', staticRoot);
    return;
  }
  protocolHandlerInstalled = true;

  protocol.handle(DESKTOP_UI_SCHEME, (req) => {
    try {
      const url = new URL(req.url);
      if (url.hostname !== 'app') {
        return new Response('Not found', { status: 404 });
      }
      const filePath = resolveSafeStaticFile(staticRoot, url.pathname);
      if (!filePath) {
        return new Response('Not found', { status: 404 });
      }
      return net.fetch(pathToFileURL(filePath).href, { bypassCustomProtocolHandlers: true });
    } catch (err) {
      console.error('[aigenius-desktop] aigenius:// protocol handler failed', err);
      return new Response('Internal error', { status: 500 });
    }
  });
  console.info('[aigenius-desktop] Serving packaged UI via aigenius://app from', staticRoot);
}
