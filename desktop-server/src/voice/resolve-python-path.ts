import fs from 'fs';
import path from 'path';
import { spawnSync } from 'child_process';

export type PythonLaunch = { command: string; argsPrefix: string[] };

function tryRun(command: string, checkArgs: string[]): boolean {
  try {
    return spawnSync(command, checkArgs, { stdio: 'ignore' }).status === 0;
  } catch {
    return false;
  }
}

function venvPythonCandidates(): string[] {
  const candidates: string[] = [];

  const bundledRoot = process.env.AIGENIUS_BUNDLED_PYTHON_VENV?.trim();
  if (bundledRoot) {
    candidates.push(path.join(bundledRoot, 'bin', 'python3'));
    if (process.platform === 'win32') {
      candidates.push(path.join(bundledRoot, 'Scripts', 'python.exe'));
    }
  }

  const userData = process.env.AIGENIUS_USER_DATA_PATH?.trim();
  if (userData) {
    const downloadedRoot = path.join(userData, 'voice-pack', 'python-venv');
    candidates.push(path.join(downloadedRoot, 'bin', 'python3'));
    if (process.platform === 'win32') {
      candidates.push(path.join(downloadedRoot, 'Scripts', 'python.exe'));
    }
  }

  return candidates;
}

/** Resolve a Python interpreter for the voice sidecar (bundled venv → downloaded pack → system). */
export function resolvePythonCommand(): PythonLaunch | null {
  const custom = process.env.PYTHON_PATH?.trim();
  if (custom && tryRun(custom, ['--version'])) {
    return { command: custom, argsPrefix: [] };
  }

  for (const interpreter of venvPythonCandidates()) {
    if (fs.existsSync(interpreter) && tryRun(interpreter, ['--version'])) {
      return { command: interpreter, argsPrefix: [] };
    }
  }

  if (tryRun('python', ['--version'])) return { command: 'python', argsPrefix: [] };
  if (process.platform === 'win32' && tryRun('py', ['-3', '--version'])) {
    return { command: 'py', argsPrefix: ['-3'] };
  }
  if (tryRun('python3', ['--version'])) return { command: 'python3', argsPrefix: [] };
  return null;
}

export function voicePackRoot(userDataPath?: string): string | null {
  const base = userDataPath?.trim() || process.env.AIGENIUS_USER_DATA_PATH?.trim();
  if (!base) return null;
  return path.join(base, 'voice-pack');
}

export function downloadedVoiceVenvRoot(userDataPath?: string): string | null {
  const root = voicePackRoot(userDataPath);
  return root ? path.join(root, 'python-venv') : null;
}

export function isDownloadedVoicePackReady(userDataPath?: string): boolean {
  const downloaded = downloadedVoiceVenvRoot(userDataPath);
  if (!downloaded) return false;

  const python =
    process.platform === 'win32'
      ? path.join(downloaded, 'Scripts', 'python.exe')
      : path.join(downloaded, 'bin', 'python3');
  return fs.existsSync(python) && tryRun(python, ['--version']);
}

/** True when a packaged or downloaded voice venv is available (not system Python). */
export function isVoicePackInstalled(userDataPath?: string): boolean {
  const bundled = process.env.AIGENIUS_BUNDLED_PYTHON_VENV?.trim();
  if (bundled) {
    const python =
      process.platform === 'win32'
        ? path.join(bundled, 'Scripts', 'python.exe')
        : path.join(bundled, 'bin', 'python3');
    if (fs.existsSync(python) && tryRun(python, ['--version'])) {
      return true;
    }
  }
  return isDownloadedVoicePackReady(userDataPath);
}
