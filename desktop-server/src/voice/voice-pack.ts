import fs from 'fs';
import path from 'path';
import { execFileSync } from 'child_process';
import {
  downloadedVoiceVenvRoot,
  isDownloadedVoicePackReady,
  isVoicePackInstalled,
  voicePackRoot,
} from './resolve-python-path.js';

export type VoicePackStatus = {
  installed: boolean;
  downloading: boolean;
  bundled: boolean;
  downloadUrl: string | null;
  error: string | null;
};

let downloadInFlight: Promise<void> | null = null;
let lastError: string | null = null;

function bundledVenvExists(): boolean {
  const bundled = process.env.AIGENIUS_BUNDLED_PYTHON_VENV?.trim();
  if (!bundled) return false;
  const python =
    process.platform === 'win32'
      ? path.join(bundled, 'Scripts', 'python.exe')
      : path.join(bundled, 'bin', 'python3');
  return fs.existsSync(python);
}

export function resolveVoicePackDownloadUrl(): string | null {
  const fromEnv = process.env.AIGENIUS_VOICE_PACK_URL?.trim();
  if (fromEnv) return fromEnv;

  const runtimePath = process.env.AIGENIUS_PACKAGE_RUNTIME_PATH?.trim();
  if (!runtimePath || !fs.existsSync(runtimePath)) return null;

  try {
    const parsed = JSON.parse(fs.readFileSync(runtimePath, 'utf8')) as { voicePackUrl?: string };
    const value = parsed.voicePackUrl?.trim();
    return value || null;
  } catch {
    return null;
  }
}

export function getVoicePackStatus(): VoicePackStatus {
  return {
    installed: isVoicePackInstalled(),
    downloading: downloadInFlight !== null,
    bundled: bundledVenvExists(),
    downloadUrl: resolveVoicePackDownloadUrl(),
    error: lastError,
  };
}

function extractTarGz(archivePath: string, destDir: string): void {
  fs.mkdirSync(destDir, { recursive: true });
  execFileSync('tar', ['-xzf', archivePath, '-C', destDir], { stdio: 'inherit' });
}

async function downloadToFile(url: string, destPath: string): Promise<void> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Voice pack download failed: HTTP ${response.status}`);
  }
  if (!response.body) {
    throw new Error('Voice pack download failed: empty response body');
  }

  await fs.promises.mkdir(path.dirname(destPath), { recursive: true });
  const file = fs.createWriteStream(destPath);
  const reader = response.body.getReader();

  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      file.write(Buffer.from(value));
    }
  } finally {
    file.end();
    await new Promise<void>((resolve, reject) => {
      file.on('finish', () => resolve());
      file.on('error', reject);
    });
  }
}

/**
 * Download and extract the optional voice Python pack into userData/voice-pack/.
 * No-op when a bundled venv exists or the pack is already installed.
 */
export async function ensureVoicePackDownloaded(): Promise<void> {
  if (isVoicePackInstalled()) {
    return;
  }

  if (downloadInFlight) {
    return downloadInFlight;
  }

  const url = resolveVoicePackDownloadUrl();
  if (!url) {
    throw new Error(
      'Voice pack is not installed. Set AIGENIUS_VOICE_PACK_URL or bundle with AIGENIUS_BUNDLE_PYTHON_VENV=1.',
    );
  }

  const userData = process.env.AIGENIUS_USER_DATA_PATH?.trim();
  if (!userData) {
    throw new Error('AIGENIUS_USER_DATA_PATH is required to install the voice pack.');
  }

  const packRoot = voicePackRoot(userData);
  const venvRoot = downloadedVoiceVenvRoot(userData);
  if (!packRoot || !venvRoot) {
    throw new Error('Could not resolve voice pack install directory.');
  }

  downloadInFlight = (async () => {
    lastError = null;
    const archivePath = path.join(packRoot, 'voice-pack.download.tar.gz');
    fs.rmSync(packRoot, { recursive: true, force: true });
    fs.mkdirSync(packRoot, { recursive: true });

    try {
      console.info(`[voice-pack] Downloading from ${url}`);
      await downloadToFile(url, archivePath);
      extractTarGz(archivePath, packRoot);
      fs.rmSync(archivePath, { force: true });

      const marker = path.join(packRoot, '.ready');
      fs.writeFileSync(marker, `${new Date().toISOString()}\n`);

      if (!isDownloadedVoicePackReady(userData)) {
        throw new Error('Voice pack extracted but Python venv validation failed.');
      }

      console.info(`[voice-pack] Installed → ${venvRoot}`);
    } catch (err) {
      lastError = err instanceof Error ? err.message : String(err);
      fs.rmSync(packRoot, { recursive: true, force: true });
      throw err;
    } finally {
      downloadInFlight = null;
    }
  })();

  return downloadInFlight;
}
