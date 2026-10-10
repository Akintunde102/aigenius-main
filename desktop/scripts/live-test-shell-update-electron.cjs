'use strict';

/**
 * Runs the OTA + Store-update contract using real Electron net.fetch (same as packaged app).
 *
 * Usage (from client/desktop):
 *   npm run compile && node scripts/live-test-shell-update-electron.cjs
 */

const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { pathToFileURL } = require('url');

const { app, net } = require('electron');

function startManifestServer() {
  const manifest = {
    uiVersion: '99.0.0',
    minDesktopVersion: '99.0.0',
    bundleUrl: 'https://example.invalid/ui-99.0.0.zip',
    sha256: '0'.repeat(64),
  };

  return new Promise((resolve, reject) => {
    const server = http.createServer((req, res) => {
      if (req.url?.split('?')[0] === '/ui-manifest.json') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(manifest));
        return;
      }
      res.writeHead(404);
      res.end();
    });
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      resolve({
        server,
        manifestUrl: `http://127.0.0.1:${port}/ui-manifest.json`,
      });
    });
    server.on('error', reject);
  });
}

async function main() {
  const userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'aigenius-electron-ota-live-'));
  const { server, manifestUrl } = await startManifestServer();

  const distOta = path.join(__dirname, '..', 'dist', 'desktop-ui-ota.js');
  if (!fs.existsSync(distOta)) {
    console.error('[live-test] Missing compiled module. Run: npm run compile');
    process.exit(1);
  }

  const { checkForSilentUiUpdate } = await import(pathToFileURL(distOta).href);
  const { shellUpdatePayloadFromOtaResult } = await import(
    pathToFileURL(path.join(__dirname, '..', 'dist', 'shell-update-notify.js')).href,
  );
  const { resolveMicrosoftStorePdpUrl } = await import(
    pathToFileURL(path.join(__dirname, '..', 'dist', 'microsoft-store-update.js')).href,
  );

  // Patch net.fetch into the OTA module's electron import is already compiled in — we call checkForSilentUiUpdate which uses electron.net internally (real).

  const result = await checkForSilentUiUpdate({
    manifestUrl,
    userDataPath,
    installedShellVersion: '0.4.0',
    currentUiVersion: '0.4.0',
  });

  const storeUrl = resolveMicrosoftStorePdpUrl();
  const payload = shellUpdatePayloadFromOtaResult(result, { isWindowsStore: true });

  server.close();
  fs.rmSync(userDataPath, { recursive: true, force: true });

  const ok =
    result.status === 'incompatible-shell' &&
    payload?.updateChannel === 'microsoft-store' &&
    storeUrl.includes('9NGQQ3GF2WHL');

  console.info('[live-test] OTA result:', result);
  console.info('[live-test] Store payload:', payload);
  console.info('[live-test] Store PDP URL:', storeUrl);
  console.info('[live-test] electron.net.fetch used:', typeof net.fetch === 'function');

  if (!ok) {
    console.error('[live-test] FAILED contract checks');
    app.exit(1);
    return;
  }
  console.info('[live-test] PASSED — incompatible-shell → Store channel wiring is correct');
  app.exit(0);
}

app.whenReady().then(() => {
  main().catch((err) => {
    console.error('[live-test] Error:', err);
    app.exit(1);
  });
});
