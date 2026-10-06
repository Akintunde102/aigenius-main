import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawnSync } from 'child_process';
import { net } from 'electron';

export interface UiOtaManifest {
  uiVersion: string;
  minDesktopVersion: string;
  bundleUrl: string;
  sha256: string;
  releaseNotes?: string;
  createdAt?: string;
}

export interface UiOtaCurrentState {
  version: string;
  installedAt: string;
  dirPath: string;
  sha256: string;
}

export type OtaCheckResult =
  | { status: 'skipped'; reason: string }
  | { status: 'up-to-date'; currentVersion: string }
  | { status: 'incompatible-shell'; requiredShellVersion: string; installedShellVersion: string }
  | { status: 'download-failed'; error: string }
  | { status: 'hash-mismatch'; expected: string; actual: string }
  | { status: 'corrupted-bundle'; error: string }
  | { status: 'applied-for-next-boot'; version: string };

export function parseSemVer(versionStr: string): [number, number, number] {
  if (!versionStr || typeof versionStr !== 'string') {
    return [0, 0, 0];
  }
  const cleaned = versionStr.trim().replace(/^[vV]/, '');
  const [major = '0', minor = '0', patch = '0'] = cleaned.split('-')[0].split('.');
  return [
    parseInt(major, 10) || 0,
    parseInt(minor, 10) || 0,
    parseInt(patch, 10) || 0,
  ];
}

export function compareSemVer(v1: string, v2: string): number {
  const [maj1, min1, pat1] = parseSemVer(v1);
  const [maj2, min2, pat2] = parseSemVer(v2);
  if (maj1 !== maj2) return maj1 - maj2;
  if (min1 !== min2) return min1 - min2;
  return pat1 - pat2;
}

export function isDesktopShellCompatible(installedShellVersion: string, minDesktopVersion: string): boolean {
  if (!minDesktopVersion) {
    return true;
  }
  return compareSemVer(installedShellVersion, minDesktopVersion) >= 0;
}

export function getOtaRoot(userDataPath: string): string {
  return path.join(userDataPath, 'ota-ui');
}

export function getCurrentStatePath(userDataPath: string): string {
  return path.join(getOtaRoot(userDataPath), 'current.json');
}

export function readCurrentOtaState(userDataPath: string): UiOtaCurrentState | null {
  try {
    const file = getCurrentStatePath(userDataPath);
    if (!fs.existsSync(file)) {
      return null;
    }
    const raw = fs.readFileSync(file, 'utf-8');
    const parsed = JSON.parse(raw) as UiOtaCurrentState;
    if (parsed && typeof parsed.version === 'string' && typeof parsed.dirPath === 'string') {
      return parsed;
    }
    return null;
  } catch (err) {
    console.warn('[aigenius-ota] Failed to read current OTA state:', err);
    return null;
  }
}

/**
 * Resolves the currently active OTA directory if valid and uncorrupted.
 * Automatically self-heals by rolling back to factory if files are missing.
 */
export function resolveActiveOtaUiDir(userDataPath: string): string | null {
  const state = readCurrentOtaState(userDataPath);
  if (!state) {
    return null;
  }

  const indexHtml = path.join(state.dirPath, 'index.html');
  if (fs.existsSync(indexHtml) && fs.statSync(indexHtml).isFile()) {
    return state.dirPath;
  }

  // Self-heal: Directory corrupted or missing index.html
  console.warn('[aigenius-ota] OTA directory invalid or missing index.html. Rolling back:', state.dirPath);
  rollbackOtaUi(userDataPath, 'Missing index.html in active OTA bundle');
  return null;
}

export function rollbackOtaUi(userDataPath: string, reason: string): void {
  try {
    const file = getCurrentStatePath(userDataPath);
    if (fs.existsSync(file)) {
      fs.unlinkSync(file);
      console.info(`[aigenius-ota] Rolled back OTA UI to factory bundle. Reason: ${reason}`);
    }
  } catch (err) {
    console.error('[aigenius-ota] Failed to rollback OTA state file:', err);
  }
}

/** Existing Cloudflare zone (`*.runpage.site`). `ota` is reserved for desktop UI bundles. */
export const DEFAULT_OTA_CDN_BASE = 'https://downloads.noboxlabs.xyz/desktop/ui';
export const DEFAULT_OTA_MANIFEST_URL = `${DEFAULT_OTA_CDN_BASE}/ui-manifest.json`;

/**
 * Manifest URL on the Cloudflare CDN.
 * A cache-bust query keeps the small JSON from sticking at the edge.
 * Versioned zip URLs stay immutable and cacheable.
 */
export function resolveOtaManifestUrl(explicitUrl?: string): string {
  const url = (
    explicitUrl ||
    process.env.CLOUDFLARE_MANIFEST_URL ||
    process.env.AIGENIUS_UI_OTA_MANIFEST_URL ||
    DEFAULT_OTA_MANIFEST_URL
  ).trim();
  if (!url) {
    return '';
  }
  const joiner = url.includes('?') ? '&' : '?';
  return `${url}${joiner}cf_ts=${Date.now()}`;
}

export function verifySha256(filePath: string, expectedHash: string): boolean {
  try {
    const content = fs.readFileSync(filePath);
    const actualHash = crypto.createHash('sha256').update(content).digest('hex').toLowerCase();
    return actualHash === expectedHash.trim().toLowerCase();
  } catch (err) {
    console.error('[aigenius-ota] Failed to compute sha256 checksum:', err);
    return false;
  }
}

export function extractZipArchive(zipFilePath: string, targetDir: string): boolean {
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  // Strategy 1: bsdtar / tar (Available out-of-the-box on Windows 10+, macOS, and Linux)
  try {
    const tarResult = spawnSync('tar', ['-xf', zipFilePath, '-C', targetDir], {
      windowsHide: true,
      stdio: 'pipe',
    });
    if (tarResult.status === 0) {
      return true;
    }
  } catch {
    /* Fallback to PowerShell on Windows */
  }

  // Strategy 2: PowerShell Expand-Archive (Windows fallback)
  if (process.platform === 'win32') {
    try {
      const psResult = spawnSync(
        'powershell.exe',
        [
          '-NoProfile',
          '-NonInteractive',
          '-Command',
          `Expand-Archive -LiteralPath '${zipFilePath}' -DestinationPath '${targetDir}' -Force`,
        ],
        {
          windowsHide: true,
          stdio: 'pipe',
        },
      );
      if (psResult.status === 0) {
        return true;
      }
    } catch (err) {
      console.error('[aigenius-ota] PowerShell extraction failed:', err);
    }
  }

  return false;
}

export async function downloadFileToPath(url: string, destPath: string): Promise<void> {
  const destDir = path.dirname(destPath);
  if (!fs.existsSync(destDir)) {
    fs.mkdirSync(destDir, { recursive: true });
  }

  const response = await net.fetch(url);
  if (!response.ok) {
    throw new Error(`HTTP ${response.status} ${response.statusText}`);
  }

  const buffer = await response.arrayBuffer();
  fs.writeFileSync(destPath, Buffer.from(buffer));
}

export interface CheckOtaOptions {
  manifestUrl?: string;
  userDataPath: string;
  installedShellVersion: string;
  currentUiVersion?: string;
}

/**
 * Checks for a UI-only update silently in the background:
 * 1. Fetches manifest.
 * 2. Checks version comparison.
 * 3. Enforces minDesktopVersion contract (guards against older shells downloading newer incompatible UIs).
 * 4. Downloads bundle silently.
 * 5. Verifies SHA-256 integrity.
 * 6. Extracts and registers state for next launch.
 */
export async function checkForSilentUiUpdate(options: CheckOtaOptions): Promise<OtaCheckResult> {
  const manifestUrl = resolveOtaManifestUrl(options.manifestUrl);

  if (!manifestUrl) {
    return { status: 'skipped', reason: 'No OTA manifest URL configured' };
  }

  let manifest: UiOtaManifest;
  try {
    const res = await net.fetch(manifestUrl, {
      headers: { 'Cache-Control': 'no-cache' },
    });
    if (!res.ok) {
      return { status: 'skipped', reason: `Manifest request failed: ${res.status}` };
    }
    manifest = (await res.json()) as UiOtaManifest;
  } catch (err) {
    return { status: 'skipped', reason: `Network error: ${String(err)}` };
  }

  if (!manifest?.uiVersion || !manifest?.bundleUrl || !manifest?.sha256) {
    return { status: 'skipped', reason: 'Invalid manifest payload' };
  }

  const currentState = readCurrentOtaState(options.userDataPath);
  const runningUiVersion = options.currentUiVersion || currentState?.version || '0.0.0';

  // Compare versions
  if (compareSemVer(manifest.uiVersion, runningUiVersion) <= 0) {
    return { status: 'up-to-date', currentVersion: runningUiVersion };
  }

  // Contract check: does the current installed native desktop shell support this UI?
  if (!isDesktopShellCompatible(options.installedShellVersion, manifest.minDesktopVersion)) {
    console.info(
      `[aigenius-ota] UI v${manifest.uiVersion} skipped: requires native desktop shell >= ${manifest.minDesktopVersion} (installed: ${options.installedShellVersion}). User must update via Microsoft Store or full installer.`,
    );
    return {
      status: 'incompatible-shell',
      requiredShellVersion: manifest.minDesktopVersion,
      installedShellVersion: options.installedShellVersion,
    };
  }

  const tempDir = path.join(getOtaRoot(options.userDataPath), 'temp');
  const tempZipPath = path.join(tempDir, `ui-${manifest.uiVersion}.zip`);
  const targetVersionDir = path.join(getOtaRoot(options.userDataPath), 'versions', manifest.uiVersion);

  try {
    // 1. Silent download
    console.info(`[aigenius-ota] Silently downloading UI update v${manifest.uiVersion}...`);
    await downloadFileToPath(manifest.bundleUrl, tempZipPath);

    // 2. Integrity check
    if (!verifySha256(tempZipPath, manifest.sha256)) {
      const content = fs.readFileSync(tempZipPath);
      const actualHash = crypto.createHash('sha256').update(content).digest('hex');
      try {
        fs.unlinkSync(tempZipPath);
      } catch {
        /* ignore */
      }
      return { status: 'hash-mismatch', expected: manifest.sha256, actual: actualHash };
    }

    // 3. Extract bundle
    const extracted = extractZipArchive(tempZipPath, targetVersionDir);
    if (!extracted) {
      return { status: 'corrupted-bundle', error: 'Failed to extract zip archive' };
    }

    // 4. Verify index.html exists
    const indexHtml = path.join(targetVersionDir, 'index.html');
    if (!fs.existsSync(indexHtml)) {
      return { status: 'corrupted-bundle', error: 'Extracted bundle does not contain index.html' };
    }

    // 5. Stage for next boot
    const newState: UiOtaCurrentState = {
      version: manifest.uiVersion,
      installedAt: new Date().toISOString(),
      dirPath: targetVersionDir,
      sha256: manifest.sha256,
    };
    fs.writeFileSync(getCurrentStatePath(options.userDataPath), JSON.stringify(newState, null, 2), 'utf-8');

    // Clean up temporary zip
    try {
      fs.unlinkSync(tempZipPath);
    } catch {
      /* ignore */
    }

    console.info(`[aigenius-ota] UI v${manifest.uiVersion} staged successfully. Will activate on next launch.`);
    return { status: 'applied-for-next-boot', version: manifest.uiVersion };
  } catch (err) {
    console.error('[aigenius-ota] Failed to apply silent UI update:', err);
    try {
      if (fs.existsSync(tempZipPath)) {
        fs.unlinkSync(tempZipPath);
      }
    } catch {
      /* ignore */
    }
    return { status: 'download-failed', error: String(err) };
  }
}
