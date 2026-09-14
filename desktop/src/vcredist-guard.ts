import { spawnSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { app } from 'electron';

/**
 * The mini-server's native modules (better-sqlite3, sharp, onnxruntime-node) require the
 * Microsoft Visual C++ Redistributable. Fresh Windows machines don't ship it, so the mini-server
 * crashes on launch with no useful error beyond a health-check timeout — the exact symptom users
 * cannot self-diagnose.
 *
 * The NSIS installer already attempts to install this (see build/installer.nsh), but that step
 * requires admin approval (UAC) and can be declined, skipped by a non-admin user, or run on a
 * machine that later had the runtime removed. This module lets the app self-heal at launch
 * instead of requiring any manual steps from the user.
 */

const VC_RUNTIME_REGISTRY_KEY = 'HKLM\\SOFTWARE\\Microsoft\\VisualStudio\\14.0\\VC\\Runtimes\\X64';

export function isVcRuntimeInstalled(): boolean {
  if (process.platform !== 'win32') {
    return true;
  }
  try {
    const result = spawnSync('reg', ['query', VC_RUNTIME_REGISTRY_KEY, '/v', 'Installed'], {
      windowsHide: true,
      encoding: 'utf8',
    });
    return result.status === 0 && /0x1\b/.test(result.stdout ?? '');
  } catch {
    // Never block startup on a detection failure — fall through to the normal backend start,
    // which will surface its own error if the runtime really is missing.
    return true;
  }
}

export function bundledVcRedistPath(): string | null {
  if (!app.isPackaged) {
    return null;
  }
  const candidate = path.join(process.resourcesPath, 'vcredist', 'vc_redist.x64.exe');
  return fs.existsSync(candidate) ? candidate : null;
}

/**
 * Triggers the native Windows UAC consent prompt and installs the redistributable.
 * Returns true only if the elevated install command completed successfully — false if the user
 * declined elevation, lacks admin rights, or the bundled installer is missing.
 */
export function installVcRuntimeElevated(): boolean {
  if (process.platform !== 'win32') {
    return true;
  }
  const exePath = bundledVcRedistPath();
  if (!exePath) {
    return false;
  }
  try {
    // Start-Process -Verb RunAs is the standard way to request UAC elevation for a child
    // process from an already-running, unelevated process (Electron has no native UAC API).
    const psCommand =
      `Start-Process -FilePath '${exePath}' ` +
      `-ArgumentList '/install','/quiet','/norestart' -Verb RunAs -Wait`;
    const result = spawnSync('powershell', ['-NoProfile', '-Command', psCommand], {
      windowsHide: true,
    });
    return result.status === 0;
  } catch {
    return false;
  }
}
