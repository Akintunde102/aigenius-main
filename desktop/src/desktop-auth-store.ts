import { app, safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';

const REFRESH_TOKEN_FILENAME = 'desktop-refresh-token.dat';
const REFRESH_TOKEN_FALLBACK = 'desktop-refresh-token.txt';

function getRefreshTokenFilePath(): string {
  return path.join(app.getPath('userData'), REFRESH_TOKEN_FILENAME);
}

function getRefreshTokenFallbackPath(): string {
  return path.join(app.getPath('userData'), REFRESH_TOKEN_FALLBACK);
}

export function storeDesktopRefreshToken(token: string): { ok: boolean, reason?: string } {
  const trimmed = token.trim();
  if (!trimmed) {
    clearDesktopRefreshToken();
    return { ok: true };
  }

  const filePath = getRefreshTokenFilePath();
  const fallbackPath = getRefreshTokenFallbackPath();

  try {
    fs.writeFileSync(fallbackPath, trimmed, 'utf8');
  } catch (err) {
    console.warn('[aigenius-desktop] Failed to write fallback token', err);
    logAuthError(err, false);
  }

  let ok = false;
  let reason: string | undefined;

  try {
    if (safeStorage.isEncryptionAvailable()) {
      fs.writeFileSync(filePath, safeStorage.encryptString(trimmed));
      ok = true;
    } else {
      console.warn('[aigenius-desktop] safeStorage unavailable; storing refresh token without OS encryption');
      fs.writeFileSync(filePath, trimmed, 'utf8');
      ok = true;
    }
  } catch (error) {
    console.warn('[aigenius-desktop] Failed to write token', error);
    logAuthError(error, safeStorage.isEncryptionAvailable());
    ok = false;
    reason = error instanceof Error ? error.message : String(error);
  }

  return { ok, reason };
}

function logAuthError(error: any, safeStorageAvailable: boolean) {
  const logPath = path.join(app.getPath('userData'), 'auth-errors.log');
  const entry = {
    timestamp: new Date().toISOString(),
    platform: process.platform,
    electronVersion: process.versions.electron,
    safeStorageAvailable,
    error: error instanceof Error ? error.message : String(error),
  };
  try {
    fs.appendFileSync(logPath, JSON.stringify(entry) + '\n', 'utf8');
  } catch (e) {
    console.warn('[aigenius-desktop] Failed to write structured auth log', e);
  }
}

export function readDesktopRefreshToken(): string | null {
  const filePath = getRefreshTokenFilePath();
  const fallbackPath = getRefreshTokenFallbackPath();

  if (!fs.existsSync(filePath) && !fs.existsSync(fallbackPath)) {
    return null;
  }

  let decrypted: string | null = null;
  if (fs.existsSync(filePath)) {
    try {
      const raw = fs.readFileSync(filePath);
      if (safeStorage.isEncryptionAvailable()) {
        decrypted = safeStorage.decryptString(raw);
      } else {
        decrypted = raw.toString('utf8');
      }
    } catch (error) {
      console.warn('[aigenius-desktop] Failed to decrypt desktop refresh token. The app may be unsigned, causing macOS Keychain to reject access on restart.', error);
    }
  }

  if (decrypted) {
    return decrypted;
  }

  // Fallback to plaintext if decryption failed (common for unsigned Mac builds)
  if (fs.existsSync(fallbackPath)) {
    try {
      return fs.readFileSync(fallbackPath, 'utf8');
    } catch (err) {
      console.warn('[aigenius-desktop] Failed to read fallback desktop refresh token', err);
    }
  }

  return null;
}

export function clearDesktopRefreshToken(): void {
  const filePath = getRefreshTokenFilePath();
  const fallbackPath = getRefreshTokenFallbackPath();
  try {
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    if (fs.existsSync(fallbackPath)) fs.unlinkSync(fallbackPath);
  } catch (error) {
    console.warn('[aigenius-desktop] Failed to clear desktop refresh token', error);
  }
}
