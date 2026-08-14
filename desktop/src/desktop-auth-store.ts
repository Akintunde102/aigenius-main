import { app, safeStorage } from 'electron';
import fs from 'fs';
import path from 'path';

const REFRESH_TOKEN_FILENAME = 'desktop-refresh-token.dat';

function getRefreshTokenFilePath(): string {
  return path.join(app.getPath('userData'), REFRESH_TOKEN_FILENAME);
}

export function storeDesktopRefreshToken(token: string): void {
  const trimmed = token.trim();
  if (!trimmed) {
    clearDesktopRefreshToken();
    return;
  }

  const filePath = getRefreshTokenFilePath();
  if (safeStorage.isEncryptionAvailable()) {
    fs.writeFileSync(filePath, safeStorage.encryptString(trimmed));
    return;
  }

  console.warn('[aigenius-desktop] safeStorage unavailable; storing refresh token without OS encryption');
  fs.writeFileSync(filePath, trimmed, 'utf8');
}

export function readDesktopRefreshToken(): string | null {
  const filePath = getRefreshTokenFilePath();
  if (!fs.existsSync(filePath)) {
    return null;
  }

  try {
    const raw = fs.readFileSync(filePath);
    if (safeStorage.isEncryptionAvailable()) {
      return safeStorage.decryptString(raw);
    }
    return raw.toString('utf8');
  } catch (error) {
    console.warn('[aigenius-desktop] Failed to read desktop refresh token', error);
    return null;
  }
}

export function clearDesktopRefreshToken(): void {
  const filePath = getRefreshTokenFilePath();
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch (error) {
    console.warn('[aigenius-desktop] Failed to clear desktop refresh token', error);
  }
}
