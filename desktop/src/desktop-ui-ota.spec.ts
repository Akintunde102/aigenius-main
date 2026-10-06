import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import {
  parseSemVer,
  compareSemVer,
  isDesktopShellCompatible,
  resolveActiveOtaUiDir,
  resolveOtaManifestUrl,
  rollbackOtaUi,
  verifySha256,
  getCurrentStatePath,
  DEFAULT_OTA_MANIFEST_URL,
  type UiOtaCurrentState,
} from './desktop-ui-ota';

describe('desktop-ui-ota', () => {
  describe('SemVer parsing and comparison', () => {
    it('parses semver with or without v prefix', () => {
      expect(parseSemVer('1.2.3')).toEqual([1, 2, 3]);
      expect(parseSemVer('v2.10.4')).toEqual([2, 10, 4]);
      expect(parseSemVer('v1.0.0-beta.1')).toEqual([1, 0, 0]);
      expect(parseSemVer('')).toEqual([0, 0, 0]);
    });

    it('compares versions correctly', () => {
      expect(compareSemVer('1.2.3', '1.2.3')).toBe(0);
      expect(compareSemVer('1.3.0', '1.2.9')).toBeGreaterThan(0);
      expect(compareSemVer('1.2.0', '1.2.1')).toBeLessThan(0);
      expect(compareSemVer('2.0.0', '1.9.9')).toBeGreaterThan(0);
    });

    it('loads the manifest from the Cloudflare CDN and bypasses a stale edge cache', () => {
      const previousCloudflare = process.env.CLOUDFLARE_MANIFEST_URL;
      const previousAlias = process.env.AIGENIUS_UI_OTA_MANIFEST_URL;
      delete process.env.CLOUDFLARE_MANIFEST_URL;
      delete process.env.AIGENIUS_UI_OTA_MANIFEST_URL;

      try {
        expect(DEFAULT_OTA_MANIFEST_URL).toBe('https://downloads.noboxlabs.xyz/desktop/ui/ui-manifest.json');
        expect(resolveOtaManifestUrl()).toMatch(
          /^https:\/\/downloads\.noboxlabs\.xyz\/desktop\/ui\/ui-manifest\.json\?cf_ts=\d+$/,
        );
        expect(resolveOtaManifestUrl('https://cdn.example.com/ui-manifest.json?v=1')).toMatch(
          /^https:\/\/cdn\.example\.com\/ui-manifest\.json\?v=1&cf_ts=\d+$/,
        );

        process.env.CLOUDFLARE_MANIFEST_URL = 'https://ota.example.com/manifest.json';
        expect(resolveOtaManifestUrl()).toMatch(/^https:\/\/ota\.example\.com\/manifest\.json\?cf_ts=\d+$/);
        expect(resolveOtaManifestUrl('https://override.example/m.json')).toMatch(
          /^https:\/\/override\.example\/m\.json\?cf_ts=\d+$/,
        );
      } finally {
        if (previousCloudflare === undefined) delete process.env.CLOUDFLARE_MANIFEST_URL;
        else process.env.CLOUDFLARE_MANIFEST_URL = previousCloudflare;
        if (previousAlias === undefined) delete process.env.AIGENIUS_UI_OTA_MANIFEST_URL;
        else process.env.AIGENIUS_UI_OTA_MANIFEST_URL = previousAlias;
      }
    });

    it('enforces minDesktopVersion compatibility contract correctly', () => {
      // Installed native shell is 1.2.0
      const installedNativeVersion = '1.2.0';

      // UI requires 1.1.0 -> compatible
      expect(isDesktopShellCompatible(installedNativeVersion, '1.1.0')).toBe(true);

      // UI requires 1.2.0 -> compatible
      expect(isDesktopShellCompatible(installedNativeVersion, '1.2.0')).toBe(true);

      // UI requires 1.3.0 (e.g. requires new IPC or sidecar binary) -> INCOMPATIBLE!
      expect(isDesktopShellCompatible(installedNativeVersion, '1.3.0')).toBe(false);

      // Missing minDesktopVersion -> treated as compatible
      expect(isDesktopShellCompatible(installedNativeVersion, '')).toBe(true);
    });
  });

  describe('Checksum and storage operations', () => {
    let tempDir: string;

    beforeEach(() => {
      tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ota-test-'));
    });

    afterEach(() => {
      try {
        fs.rmSync(tempDir, { recursive: true, force: true });
      } catch {
        /* ignore */
      }
    });

    it('verifies SHA256 checksum correctly', () => {
      const sampleFile = path.join(tempDir, 'test-file.txt');
      const testContent = 'Hello AIGenius OTA update!';
      fs.writeFileSync(sampleFile, testContent, 'utf-8');

      const expectedHash = crypto.createHash('sha256').update(testContent).digest('hex');
      expect(verifySha256(sampleFile, expectedHash)).toBe(true);
      expect(verifySha256(sampleFile, expectedHash.toUpperCase())).toBe(true);
      expect(verifySha256(sampleFile, 'wrong_hash')).toBe(false);
    });

    it('resolves active OTA directory when valid index.html exists', () => {
      const uiDir = path.join(tempDir, 'ota-ui', 'versions', '2.0.0');
      fs.mkdirSync(uiDir, { recursive: true });
      fs.writeFileSync(path.join(uiDir, 'index.html'), '<html><body>AIGenius</body></html>', 'utf-8');

      const stateFile = getCurrentStatePath(tempDir);
      fs.mkdirSync(path.dirname(stateFile), { recursive: true });
      const state: UiOtaCurrentState = {
        version: '2.0.0',
        installedAt: new Date().toISOString(),
        dirPath: uiDir,
        sha256: 'dummy_hash',
      };
      fs.writeFileSync(stateFile, JSON.stringify(state), 'utf-8');

      const resolved = resolveActiveOtaUiDir(tempDir);
      expect(resolved).toBe(uiDir);
    });

    it('self-heals and rolls back if active OTA bundle is corrupted or missing index.html', () => {
      const uiDir = path.join(tempDir, 'ota-ui', 'versions', '2.0.0');
      fs.mkdirSync(uiDir, { recursive: true });
      // NOTE: index.html is NOT created, simulating a broken/partial extract!

      const stateFile = getCurrentStatePath(tempDir);
      fs.mkdirSync(path.dirname(stateFile), { recursive: true });
      const state: UiOtaCurrentState = {
        version: '2.0.0',
        installedAt: new Date().toISOString(),
        dirPath: uiDir,
        sha256: 'dummy_hash',
      };
      fs.writeFileSync(stateFile, JSON.stringify(state), 'utf-8');

      const resolved = resolveActiveOtaUiDir(tempDir);
      expect(resolved).toBeNull(); // Safely rolls back to null (factory fallback)
      expect(fs.existsSync(stateFile)).toBe(false); // Cleaned up corrupted state
    });

    it('rolls back explicitly via rollbackOtaUi', () => {
      const stateFile = getCurrentStatePath(tempDir);
      fs.mkdirSync(path.dirname(stateFile), { recursive: true });
      fs.writeFileSync(stateFile, '{"version":"1.0.0"}', 'utf-8');

      expect(fs.existsSync(stateFile)).toBe(true);
      rollbackOtaUi(tempDir, 'manual test rollback');
      expect(fs.existsSync(stateFile)).toBe(false);
    });
  });
});
