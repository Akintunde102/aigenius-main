import { BrowserWindow, shell, app } from 'electron';
import http from 'http';
import net from 'net';
import path from 'path';
import { DEV_LOOPBACK_HOST, loopbackHttpUrl } from './loopback-host';
import { exchangeDesktopOAuthCode } from './desktop-auth-exchange';
import { storeDesktopRefreshToken } from './desktop-auth-store';
import { resolveUpstreamApiUrl as resolveDesktopUpstreamApiUrl } from './resolve-upstream-api-url';
import { resolveFrontendPort } from './frontend-port';

const FRONTEND_PORT = resolveFrontendPort();
const DESKTOP_OAUTH_SIGNIN_COMPLETE_CHAN = 'desktop-oauth-signin-complete';
const WEBSITE_LOGIN_URL = app.isPackaged
  ? 'https://aigenius.noboxlabs.xyz/login'
  : loopbackHttpUrl(FRONTEND_PORT, '/login');

function resolveUpstreamApiUrl(): string {
  return resolveDesktopUpstreamApiUrl({
    desktopRoot: path.join(__dirname, '..'),
    packagedResourcesPath: app.isPackaged ? process.resourcesPath : undefined,
  });
}

type DesktopBrowserSignInOptions = {
  autoProvider?: 'google';
};

export function buildUpstreamGoogleAuthUrl(upstream: string, desktopCallback: string): string {
  const params = new URLSearchParams({
    callback_url: desktopCallback,
    callback_client: 'desktop',
  });
  return `${upstream.replace(/\/+$/, '')}/auth/_/google?${params.toString()}`;
}

/**
 * OAuth in an embedded Electron window is blocked by Google (blank popup). Use the system browser
 * and a loopback callback so the shell receives the issued token.
 */
export function runDesktopBrowserSignIn(
  event: Electron.IpcMainInvokeEvent,
  options: DesktopBrowserSignInOptions = {},
): Promise<{ token: string } | null> {
  return new Promise((resolve) => {
    const server = http.createServer((req, res) => {
      void (async () => {
        const u = new URL(req.url || '', `http://${req.headers.host}`);
        const oauthCode = u.searchParams.get('code');
        const legacyToken = u.searchParams.get('token');

        const finishSuccess = (accessToken: string) => {
          const websiteBase = WEBSITE_LOGIN_URL.replace('/login', '');
          res.writeHead(200, { 'Content-Type': 'text/html' });
          res.end(`
            <html>
              <head>
                <title>Sign-in Successful</title>
                <meta http-equiv="refresh" content="2;url=${websiteBase}/desktop-success">
                <style>
                  body {
                    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    height: 100vh;
                    margin: 0;
                    background: #0c0d0f;
                    color: white;
                    text-align: center;
                  }
                  .container {
                    max-width: 400px;
                    padding: 2rem;
                  }
                  .icon {
                    font-size: 4rem;
                    margin-bottom: 1rem;
                    color: #10b981;
                  }
                  h1 {
                    font-size: 1.5rem;
                    margin-bottom: 0.5rem;
                  }
                  p {
                    color: #9ca3af;
                    line-height: 1.5;
                  }
                  .spinner {
                    margin-top: 2rem;
                    display: inline-block;
                    width: 1.5rem;
                    height: 1.5rem;
                    border: 3px solid rgba(255,255,255,.1);
                    border-radius: 50%;
                    border-top-color: #10b981;
                    animation: spin 1s ease-in-out infinite;
                  }
                  @keyframes spin {
                    to { transform: rotate(360deg); }
                  }
                </style>
              </head>
              <body>
                <div class="container">
                  <div class="icon">✓</div>
                  <h1>Sign-in Successful</h1>
                  <p>AIGenius Desktop has been authenticated. You can close this tab and return to the app.</p>
                  <div class="spinner"></div>
                </div>
                <script>setTimeout(() => { try { window.close(); } catch (_) {} }, 1500);</script>
              </body>
            </html>
          `);
          server.close();

          const win = BrowserWindow.fromWebContents(event.sender);
          if (win) {
            if (win.isMinimized()) win.restore();
            win.show();
            win.focus();
          }

          try {
            event.sender.send(DESKTOP_OAUTH_SIGNIN_COMPLETE_CHAN, { token: accessToken });
          } catch (err) {
            console.warn('[aigenius-desktop] OAuth complete push failed', err);
          }

          resolve({ token: accessToken });
        };

        if (oauthCode) {
          const exchanged = await exchangeDesktopOAuthCode(resolveUpstreamApiUrl(), oauthCode);
          if (!exchanged) {
            res.writeHead(400);
            res.end('OAuth code exchange failed');
            server.close();
            resolve(null);
            return;
          }
          storeDesktopRefreshToken(exchanged.refreshToken);
          finishSuccess(exchanged.token);
          return;
        }

        if (legacyToken) {
          finishSuccess(legacyToken);
          return;
        }

        res.writeHead(400);
        res.end('Missing OAuth code');
        server.close();
        resolve(null);
      })().catch((error) => {
        console.error('[aigenius-desktop] OAuth loopback handler failed', error);
        res.writeHead(500);
        res.end('Sign-in failed');
        server.close();
        resolve(null);
      });
    });

    server.listen(0, DEV_LOOPBACK_HOST, () => {
      const addr = server.address() as net.AddressInfo;
      const callbackUrl = loopbackHttpUrl(addr.port, '/');
      const upstream = resolveUpstreamApiUrl();

      if (options.autoProvider === 'google') {
        void shell.openExternal(buildUpstreamGoogleAuthUrl(upstream, callbackUrl));
        return;
      }

      const params = new URLSearchParams({
        desktop_callback: callbackUrl,
        api_root: upstream,
      });
      const authUrl = `${WEBSITE_LOGIN_URL}?${params.toString()}`;
      void shell.openExternal(authUrl);
    });

    server.on('error', (err) => {
      console.error('[aigenius-desktop] Web sign-in server error:', err);
      resolve(null);
    });

    setTimeout(() => {
      if (server.listening) {
        server.close();
        resolve(null);
      }
    }, 5 * 60 * 1000);
  });
}
