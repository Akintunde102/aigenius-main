/**
 * Live Integration Tests — desktop-ui-ota
 *
 * These tests exercise the REAL code paths against real filesystem I/O and a
 * real local HTTP server. No mocks for the module under test. We only mock:
 *   - `electron` (via jest.setup.cjs — unavoidable in a Node Jest context)
 *   - `net.fetch` → replaced with a real Node `http`/`https` fetch adapter so
 *     the core download/verify/extract pipeline runs against actual bytes.
 *
 * Scenarios covered:
 *   1. Full happy-path — manifest served locally → download → SHA-256 verify
 *      → extract → `current.json` written → `applied-for-next-boot`
 *   2. Up-to-date guard — manifest version ≤ current version → `up-to-date`
 *   3. Incompatible shell — manifest `minDesktopVersion` > installed shell
 *      → `incompatible-shell`
 *   4. Hash-mismatch — manifest sha256 is wrong → `hash-mismatch` + temp
 *      file cleaned up
 *   5. Missing index.html in extracted bundle → `corrupted-bundle`
 *   6. extractZipArchive — real zip create + extract roundtrip
 *   7. verifySha256 — real hash of a real file (double-check integration)
 *   8. resolveActiveOtaUiDir — self-healing rollback when index.html missing
 *   9. Manifest 404 → graceful `skipped` with reason
 *  10. Network error / unreachable URL → graceful `skipped` with reason
 */

import fs from 'fs';
import path from 'path';
import os from 'os';
import crypto from 'crypto';
import http from 'http';
import { spawnSync } from 'child_process';
import { AddressInfo } from 'net';

import {
  checkForSilentUiUpdate,
  extractZipArchive,
  verifySha256,
  resolveActiveOtaUiDir,
  rollbackOtaUi,
  getCurrentStatePath,
  type UiOtaManifest,
  type UiOtaCurrentState,
} from './desktop-ui-ota';

// ---------------------------------------------------------------------------
// Patch net.fetch → Node http/https so download works outside Electron
// ---------------------------------------------------------------------------

/**
 * A lightweight fetch adapter backed by Node's `http` module.
 * Only handles `http:` URLs (sufficient for our local test server).
 */
function nodeFetch(url: string, _opts?: RequestInit): Promise<Response> {
  return new Promise((resolve, reject) => {
    http
      .get(url, (res) => {
        const chunks: Buffer[] = [];
        res.on('data', (chunk: Buffer) => chunks.push(chunk));
        res.on('end', () => {
          const body = Buffer.concat(chunks);
          const status = res.statusCode ?? 0;
          const ok = status >= 200 && status < 300;
          resolve({
            ok,
            status,
            statusText: res.statusMessage ?? '',
            arrayBuffer: () => Promise.resolve(body.buffer.slice(body.byteOffset, body.byteOffset + body.byteLength)),
            json: () => {
              try {
                return Promise.resolve(JSON.parse(body.toString('utf-8')));
              } catch (e) {
                return Promise.reject(e);
              }
            },
            text: () => Promise.resolve(body.toString('utf-8')),
          } as Response);
        });
        res.on('error', reject);
      })
      .on('error', reject);
  });
}

// Inject into the electron net mock (jest.setup.cjs only mocks app/ipcMain)
jest.mock('electron', () => ({
  app: {
    isPackaged: false,
    getPath: jest.fn(() => ''),
    getAppPath: jest.fn(() => ''),
    getVersion: jest.fn(() => '1.0.0'),
  },
  net: {
    fetch: jest.fn(nodeFetch),
  },
}));

// ---------------------------------------------------------------------------
// Helper: create a minimal valid zip containing index.html (using tar)
// ---------------------------------------------------------------------------

/**
 * Creates a minimal zip at `zipPath` containing `index.html` with the given
 * content. Returns the SHA-256 hex of the zip file.
 */
function createMinimalUiZip(zipPath: string, htmlContent = '<html><body>AIGenius OTA Test</body></html>'): string {
  const scratchDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ota-zip-src-'));
  try {
    fs.writeFileSync(path.join(scratchDir, 'index.html'), htmlContent, 'utf-8');
    fs.mkdirSync(path.dirname(zipPath), { recursive: true });

    // Try tar first (available on Windows 10+, macOS, Linux)
    const tarResult = spawnSync('tar', ['-czf', zipPath, '-C', scratchDir, 'index.html'], {
      windowsHide: true,
      stdio: 'pipe',
    });

    if (tarResult.status !== 0 && process.platform === 'win32') {
      // Fallback: PowerShell Compress-Archive
      const psResult = spawnSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          `Compress-Archive -Path '${path.join(scratchDir, 'index.html')}' -DestinationPath '${zipPath}' -Force`,
        ],
        { windowsHide: true, stdio: 'pipe' },
      );
      if (psResult.status !== 0) {
        throw new Error(
          `Failed to create test zip. tar stderr: ${tarResult.stderr?.toString()}, ps stderr: ${psResult.stderr?.toString()}`,
        );
      }
    } else if (tarResult.status !== 0) {
      throw new Error(`Failed to create test zip via tar: ${tarResult.stderr?.toString()}`);
    }

    const content = fs.readFileSync(zipPath);
    return crypto.createHash('sha256').update(content).digest('hex');
  } finally {
    fs.rmSync(scratchDir, { recursive: true, force: true });
  }
}

// ---------------------------------------------------------------------------
// Helper: spin up a local HTTP server for one test
// ---------------------------------------------------------------------------

interface TestServer {
  baseUrl: string;
  close: () => Promise<void>;
}

function startLocalServer(handler: http.RequestListener): Promise<TestServer> {
  return new Promise((resolve, reject) => {
    const server = http.createServer(handler);
    server.listen(0, '127.0.0.1', () => {
      const port = (server.address() as AddressInfo).port;
      resolve({
        baseUrl: `http://127.0.0.1:${port}`,
        close: () =>
          new Promise<void>((res, rej) => server.close((err) => (err ? rej(err) : res()))),
      });
    });
    server.on('error', reject);
  });
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('desktop-ui-ota — live integration', () => {
  let tempDir: string;

  beforeEach(() => {
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ota-live-'));
  });

  afterEach(() => {
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {
      /* ignore */
    }
  });

  // -------------------------------------------------------------------------
  // 1. Happy path — full pipeline end-to-end
  // -------------------------------------------------------------------------

  it('applies a UI update end-to-end: download → verify → extract → current.json written', async () => {
    // Prepare a real zip
    const zipDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ota-zip-'));
    const zipPath = path.join(zipDir, 'ui-2.0.0.zip');
    const expectedSha = createMinimalUiZip(zipPath);

    const manifest: UiOtaManifest = {
      uiVersion: '2.0.0',
      minDesktopVersion: '1.0.0',
      bundleUrl: '', // filled after server starts
      sha256: expectedSha,
      createdAt: new Date().toISOString(),
    };

    let server!: TestServer;
    try {
      server = await startLocalServer((req, res) => {
        if (req.url === '/ui-manifest.json' || req.url?.startsWith('/ui-manifest.json?')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ...manifest, bundleUrl: `${server.baseUrl}/ui-2.0.0.zip` }));
        } else if (req.url === '/ui-2.0.0.zip') {
          const data = fs.readFileSync(zipPath);
          res.writeHead(200, { 'Content-Type': 'application/zip', 'Content-Length': String(data.length) });
          res.end(data);
        } else {
          res.writeHead(404);
          res.end('Not found');
        }
      });

      const result = await checkForSilentUiUpdate({
        manifestUrl: `${server.baseUrl}/ui-manifest.json`,
        userDataPath: tempDir,
        installedShellVersion: '1.5.0',
        currentUiVersion: '1.0.0',
      });

      expect(result.status).toBe('applied-for-next-boot');
      if (result.status === 'applied-for-next-boot') {
        expect(result.version).toBe('2.0.0');
      }

      // current.json must exist and be correct
      const stateFile = getCurrentStatePath(tempDir);
      expect(fs.existsSync(stateFile)).toBe(true);
      const state: UiOtaCurrentState = JSON.parse(fs.readFileSync(stateFile, 'utf-8'));
      expect(state.version).toBe('2.0.0');
      expect(state.sha256).toBe(expectedSha);
      expect(typeof state.installedAt).toBe('string');

      // index.html must be accessible in the extracted dir
      const indexHtml = path.join(state.dirPath, 'index.html');
      expect(fs.existsSync(indexHtml)).toBe(true);

      // temp zip must have been cleaned up
      const tempZipPath = path.join(tempDir, 'ota-ui', 'temp', 'ui-2.0.0.zip');
      expect(fs.existsSync(tempZipPath)).toBe(false);
    } finally {
      if (server) await server.close();
      fs.rmSync(zipDir, { recursive: true, force: true });
    }
  }, 30_000);

  // -------------------------------------------------------------------------
  // 2. Up-to-date guard
  // -------------------------------------------------------------------------

  it('returns up-to-date when manifest version is not newer than current', async () => {
    const manifest: UiOtaManifest = {
      uiVersion: '1.0.0',
      minDesktopVersion: '1.0.0',
      bundleUrl: 'http://127.0.0.1:9999/never-reached.zip',
      sha256: 'dummy',
    };

    const server = await startLocalServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(manifest));
    });

    try {
      const result = await checkForSilentUiUpdate({
        manifestUrl: `${server.baseUrl}/ui-manifest.json`,
        userDataPath: tempDir,
        installedShellVersion: '1.0.0',
        currentUiVersion: '1.0.0', // same as manifest — up-to-date
      });
      expect(result.status).toBe('up-to-date');
    } finally {
      await server.close();
    }
  }, 15_000);

  // -------------------------------------------------------------------------
  // 3. Incompatible shell
  // -------------------------------------------------------------------------

  it('skips update when installed shell is too old for the new UI', async () => {
    const manifest: UiOtaManifest = {
      uiVersion: '3.0.0',
      minDesktopVersion: '2.5.0', // requires newer native shell
      bundleUrl: 'http://127.0.0.1:9999/never-reached.zip',
      sha256: 'dummy',
    };

    const server = await startLocalServer((req, res) => {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(manifest));
    });

    try {
      const result = await checkForSilentUiUpdate({
        manifestUrl: `${server.baseUrl}/ui-manifest.json`,
        userDataPath: tempDir,
        installedShellVersion: '1.5.0', // too old
        currentUiVersion: '1.0.0',
      });
      expect(result.status).toBe('incompatible-shell');
      if (result.status === 'incompatible-shell') {
        expect(result.requiredShellVersion).toBe('2.5.0');
        expect(result.installedShellVersion).toBe('1.5.0');
      }
    } finally {
      await server.close();
    }
  }, 15_000);

  // -------------------------------------------------------------------------
  // 4. Hash mismatch — corrupted download
  // -------------------------------------------------------------------------

  it('returns hash-mismatch and cleans up temp file when SHA-256 does not match', async () => {
    const zipDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ota-zip-'));
    const zipPath = path.join(zipDir, 'ui-2.1.0.zip');
    createMinimalUiZip(zipPath);

    const manifest: UiOtaManifest = {
      uiVersion: '2.1.0',
      minDesktopVersion: '1.0.0',
      bundleUrl: '', // filled after server starts
      sha256: 'deadbeef0000000000000000000000000000000000000000000000000000cafe', // wrong hash
    };

    let server!: TestServer;
    try {
      server = await startLocalServer((req, res) => {
        if (req.url === '/ui-manifest.json' || req.url?.startsWith('/ui-manifest.json?')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ...manifest, bundleUrl: `${server.baseUrl}/ui-2.1.0.zip` }));
        } else if (req.url === '/ui-2.1.0.zip') {
          const data = fs.readFileSync(zipPath);
          res.writeHead(200, { 'Content-Type': 'application/zip' });
          res.end(data);
        } else {
          res.writeHead(404);
          res.end();
        }
      });

      const result = await checkForSilentUiUpdate({
        manifestUrl: `${server.baseUrl}/ui-manifest.json`,
        userDataPath: tempDir,
        installedShellVersion: '1.0.0',
        currentUiVersion: '1.0.0',
      });

      expect(result.status).toBe('hash-mismatch');

      // Temp file must have been deleted after mismatch
      const tempZipPath = path.join(tempDir, 'ota-ui', 'temp', 'ui-2.1.0.zip');
      expect(fs.existsSync(tempZipPath)).toBe(false);
    } finally {
      if (server) await server.close();
      fs.rmSync(zipDir, { recursive: true, force: true });
    }
  }, 20_000);

  // -------------------------------------------------------------------------
  // 5. Missing index.html in extracted bundle
  // -------------------------------------------------------------------------

  it('returns corrupted-bundle when extracted zip contains no index.html', async () => {
    // Create a zip WITHOUT index.html
    const zipDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ota-zip-'));
    const zipPath = path.join(zipDir, 'ui-2.2.0.zip');

    // Create zip with a different file (not index.html)
    const srcDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ota-src-'));
    fs.writeFileSync(path.join(srcDir, 'app.js'), 'console.log("no index")', 'utf-8');
    const tarResult = spawnSync('tar', ['-czf', zipPath, '-C', srcDir, 'app.js'], {
      windowsHide: true,
      stdio: 'pipe',
    });
    fs.rmSync(srcDir, { recursive: true, force: true });

    if (tarResult.status !== 0) {
      // Skip this test if we can't create the zip
      console.warn('Skipping missing-index.html test: could not create test zip');
      fs.rmSync(zipDir, { recursive: true, force: true });
      return;
    }

    const zipContent = fs.readFileSync(zipPath);
    const sha = crypto.createHash('sha256').update(zipContent).digest('hex');

    const manifest: UiOtaManifest = {
      uiVersion: '2.2.0',
      minDesktopVersion: '1.0.0',
      bundleUrl: '',
      sha256: sha,
    };

    let server!: TestServer;
    try {
      server = await startLocalServer((req, res) => {
        if (req.url === '/ui-manifest.json' || req.url?.startsWith('/ui-manifest.json?')) {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ...manifest, bundleUrl: `${server.baseUrl}/ui-2.2.0.zip` }));
        } else if (req.url === '/ui-2.2.0.zip') {
          res.writeHead(200, { 'Content-Type': 'application/zip' });
          res.end(zipContent);
        } else {
          res.writeHead(404);
          res.end();
        }
      });

      const result = await checkForSilentUiUpdate({
        manifestUrl: `${server.baseUrl}/ui-manifest.json`,
        userDataPath: tempDir,
        installedShellVersion: '1.0.0',
        currentUiVersion: '1.0.0',
      });

      expect(result.status).toBe('corrupted-bundle');
    } finally {
      if (server) await server.close();
      fs.rmSync(zipDir, { recursive: true, force: true });
    }
  }, 20_000);

  // -------------------------------------------------------------------------
  // 6. Real zip extract roundtrip
  // -------------------------------------------------------------------------

  it('extractZipArchive correctly extracts a real zip to a target directory', () => {
    const zipDir = fs.mkdtempSync(path.join(os.tmpdir(), 'ota-extract-'));
    const zipPath = path.join(zipDir, 'test-bundle.zip');
    const htmlContent = '<html><body>Real extraction test</body></html>';

    createMinimalUiZip(zipPath, htmlContent);

    const extractTarget = path.join(zipDir, 'extracted');
    const success = extractZipArchive(zipPath, extractTarget);

    expect(success).toBe(true);
    const extractedIndex = path.join(extractTarget, 'index.html');
    expect(fs.existsSync(extractedIndex)).toBe(true);
    const read = fs.readFileSync(extractedIndex, 'utf-8');
    expect(read).toBe(htmlContent);

    fs.rmSync(zipDir, { recursive: true, force: true });
  });

  // -------------------------------------------------------------------------
  // 7. SHA-256 — real file hash
  // -------------------------------------------------------------------------

  it('verifySha256 correctly computes and validates a real file hash', () => {
    const file = path.join(tempDir, 'integrity-check.bin');
    const content = Buffer.from('AIGenius OTA live integration test payload', 'utf-8');
    fs.writeFileSync(file, content);

    const expected = crypto.createHash('sha256').update(content).digest('hex');
    expect(verifySha256(file, expected)).toBe(true);
    expect(verifySha256(file, expected.toUpperCase())).toBe(true); // case-insensitive
    expect(verifySha256(file, 'badhash')).toBe(false);
  });

  // -------------------------------------------------------------------------
  // 8. resolveActiveOtaUiDir — self-healing
  // -------------------------------------------------------------------------

  it('resolveActiveOtaUiDir self-heals by deleting current.json when index.html missing', () => {
    const uiDir = path.join(tempDir, 'ota-ui', 'versions', '3.0.0');
    fs.mkdirSync(uiDir, { recursive: true });
    // DO NOT create index.html — simulate partial extraction failure

    const stateFile = getCurrentStatePath(tempDir);
    fs.mkdirSync(path.dirname(stateFile), { recursive: true });
    const state: UiOtaCurrentState = {
      version: '3.0.0',
      installedAt: new Date().toISOString(),
      dirPath: uiDir,
      sha256: 'irrelevant',
    };
    fs.writeFileSync(stateFile, JSON.stringify(state), 'utf-8');

    const resolved = resolveActiveOtaUiDir(tempDir);
    expect(resolved).toBeNull();
    expect(fs.existsSync(stateFile)).toBe(false); // Rolled back
  });

  // -------------------------------------------------------------------------
  // 9. Manifest 404 → graceful skipped
  // -------------------------------------------------------------------------

  it('returns skipped with reason when manifest returns 404', async () => {
    const server = await startLocalServer((_req, res) => {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    });

    try {
      const result = await checkForSilentUiUpdate({
        manifestUrl: `${server.baseUrl}/ui-manifest.json`,
        userDataPath: tempDir,
        installedShellVersion: '1.0.0',
        currentUiVersion: '1.0.0',
      });

      expect(result.status).toBe('skipped');
      if (result.status === 'skipped') {
        expect(result.reason).toMatch(/404/);
      }
    } finally {
      await server.close();
    }
  }, 15_000);

  // -------------------------------------------------------------------------
  // 10. Unreachable URL → graceful skipped
  // -------------------------------------------------------------------------

  it('returns skipped when the manifest URL is completely unreachable', async () => {
    // Port 1 is almost certainly not listening on localhost
    const result = await checkForSilentUiUpdate({
      manifestUrl: 'http://127.0.0.1:1/ui-manifest.json',
      userDataPath: tempDir,
      installedShellVersion: '1.0.0',
      currentUiVersion: '1.0.0',
    });

    expect(result.status).toBe('skipped');
    if (result.status === 'skipped') {
      expect(result.reason).toMatch(/Network error/i);
    }
  }, 15_000);
});
