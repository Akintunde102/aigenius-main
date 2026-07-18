'use strict';

/**
 * Tilt entry for the Electron shell.
 *
 * - Runs heavy one-time setup (native rebuild + desktop-server build) once per Tilt session.
 * - Recompiles TypeScript, then launches Electron.
 * - On clean exit (user closed the window), blocks instead of exiting so Tilt does not
 *   immediately rerun the full pipeline. Use Tilt's Restart button to relaunch.
 * - On crash, retries a few times then blocks (avoids infinite compile loops).
 */

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const desktopRoot = path.join(__dirname, '..');
const MAX_CRASH_RETRIES = 3;

function resolveLocalBin(name) {
  const ext = process.platform === 'win32' ? '.cmd' : '';
  const candidate = path.join(desktopRoot, 'node_modules', '.bin', name + ext);
  return fs.existsSync(candidate) ? candidate : name;
}

function runSync(label, args) {
  console.log(`[dev-tilt] ${label}`);
  const result = spawnSync('npm', args, {
    cwd: desktopRoot,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function runElectron() {
  const electronBin = resolveLocalBin('electron');
  const env = {
    ...process.env,
    ELECTRON_DISABLE_SANDBOX: '1',
  };

  return new Promise((resolve) => {
    const child = spawn(electronBin, ['.'], {
      cwd: desktopRoot,
      stdio: 'inherit',
      env,
      shell: process.platform === 'win32',
    });
    child.on('error', (err) => {
      console.error('[dev-tilt] Failed to start Electron:', err.message);
      resolve(1);
    });
    child.on('close', (code, signal) => {
      if (signal) {
        resolve(128);
        return;
      }
      resolve(code ?? 1);
    });
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function blockUntilTiltRestart(reason) {
  console.log(`[dev-tilt] ${reason}`);
  console.log('[dev-tilt] Use Restart in the Tilt dashboard to try again.');
  return new Promise(() => {});
}

async function main() {
  runSync('rebuild:better-sqlite3', ['run', 'rebuild:better-sqlite3']);
  runSync('build:server', ['run', 'build:server']);

  let crashCount = 0;

  while (true) {
    runSync('compile', ['run', 'compile']);
    const code = await runElectron();

    if (code === 0) {
      crashCount = 0;
      await blockUntilTiltRestart('Electron closed.');
      return;
    }

    crashCount += 1;
    if (crashCount >= MAX_CRASH_RETRIES) {
      await blockUntilTiltRestart(
        `Electron failed ${MAX_CRASH_RETRIES} times (last exit code ${code}).`,
      );
      return;
    }

    console.warn(
      `[dev-tilt] Electron exited with code ${code}; retry ${crashCount}/${MAX_CRASH_RETRIES} in 3s...`,
    );
    await sleep(3000);
  }
}

main().catch((err) => {
  console.error('[dev-tilt]', err);
  process.exit(1);
});
