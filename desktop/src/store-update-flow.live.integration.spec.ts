/**
 * Live integration: real HTTP manifest + same OTA contract logic as packaged apps.
 * Uses global fetch (Node) — Electron main uses net.fetch with the same URLs.
 *
 * Run: npm test -- --testPathPattern=store-update-flow.live.integration
 */

import http from 'http';
import fs from 'fs';
import os from 'os';
import path from 'path';
import type { AddressInfo } from 'net';

jest.mock('electron', () => ({
  net: {
    fetch: (input: string | URL, init?: RequestInit) =>
      global.fetch(typeof input === 'string' ? input : input.toString(), init),
  },
}));

import {
  checkForSilentUiUpdate,
  DEFAULT_OTA_MANIFEST_URL,
  resolveOtaManifestUrl,
} from './desktop-ui-ota';
import { shellUpdatePayloadFromOtaResult } from './shell-update-notify';
import { MS_STORE_PRODUCT_ID, resolveMicrosoftStorePdpUrl } from './microsoft-store-update';

describe('store update flow (live integration)', () => {
  let server: http.Server;
  let localManifestUrl: string;
  let userDataPath: string;

  beforeAll(async () => {
    userDataPath = fs.mkdtempSync(path.join(os.tmpdir(), 'aigenius-store-update-live-'));
    const manifest = {
      uiVersion: '99.0.0',
      minDesktopVersion: '99.0.0',
      bundleUrl: 'https://example.invalid/ui-99.0.0.zip',
      sha256: '0'.repeat(64),
      createdAt: new Date().toISOString(),
    };

    server = http.createServer((req, res) => {
      if (req.url?.split('?')[0] === '/ui-manifest.json') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(manifest));
        return;
      }
      res.writeHead(404);
      res.end('not found');
    });

    await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
    const port = (server.address() as AddressInfo).port;
    localManifestUrl = `http://127.0.0.1:${port}/ui-manifest.json`;
  });

  afterAll(async () => {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    fs.rmSync(userDataPath, { recursive: true, force: true });
  });

  it('detects incompatible-shell from a live manifest and maps to Store channel', async () => {
    const result = await checkForSilentUiUpdate({
      manifestUrl: localManifestUrl,
      userDataPath,
      installedShellVersion: '0.4.0',
      currentUiVersion: '0.4.0',
    });

    expect(result).toEqual({
      status: 'incompatible-shell',
      requiredShellVersion: '99.0.0',
      installedShellVersion: '0.4.0',
    });

    const payload = shellUpdatePayloadFromOtaResult(result, { isWindowsStore: true });
    expect(payload).toEqual({
      requiredShellVersion: '99.0.0',
      installedShellVersion: '0.4.0',
      updateChannel: 'microsoft-store',
    });
  });

  it('uses the AIGenius Microsoft Store product id in the default PDP URL', () => {
    expect(MS_STORE_PRODUCT_ID).toBe('9NGQQ3GF2WHL');
    expect(resolveMicrosoftStorePdpUrl()).toBe(
      'ms-windows-store://pdp/?productid=9NGQQ3GF2WHL',
    );
  });

});

const runProductionOtaLive = process.env.RUN_PRODUCTION_OTA_LIVE === '1';

(runProductionOtaLive ? describe : describe.skip)(
  'production UI manifest CDN (RUN_PRODUCTION_OTA_LIVE=1)',
  () => {
    it('manifest is public JSON at downloads.noboxlabs.xyz', async () => {
      const url = resolveOtaManifestUrl(DEFAULT_OTA_MANIFEST_URL.split('?')[0]);
      const res = await global.fetch(url);
      const bodyText = await res.text();

      expect(res.ok).toBe(true);

      const manifest = JSON.parse(bodyText) as {
        uiVersion?: string;
        minDesktopVersion?: string;
        bundleUrl?: string;
        sha256?: string;
      };
      expect(manifest.uiVersion).toBeTruthy();
      expect(manifest.minDesktopVersion).toBeTruthy();
      expect(manifest.bundleUrl).toBeTruthy();
      expect(manifest.sha256).toBeTruthy();
    });
  },
);
