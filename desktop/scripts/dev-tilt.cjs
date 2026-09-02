'use strict';

/**
 * Tilt entry for the Electron shell.
 *
 * - Runs heavy one-time setup (native rebuild + desktop-server build) once per dev session.
 * - Recompiles TypeScript, then launches Electron.
 * - On clean exit (user closed the window), relaunches quickly without redoing native rebuild.
 * - On crash, retries a few times then blocks (avoids infinite compile loops).
 */

const { spawn, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { waitForFrontendReady } = require('../../../scripts/ensure-frontend-ready.cjs');

const desktopRoot = path.join(__dirname, '..');
const MAX_CRASH_RETRIES = 3;
const SETUP_STAMP = path.join(desktopRoot, '.tilt-setup-stamp.json');
const SETUP_WATCH_FILES = [
  path.join(desktopRoot, 'package.json'),
  path.join(desktopRoot, 'package-lock.json'),
  path.join(desktopRoot, '..', 'desktop-server', 'package.json'),
  path.join(desktopRoot, '..', 'desktop-server', 'package-lock.json'),
];

function resolveLocalBin(name) {
  const ext = process.platform === 'win32' ? '.cmd' : '';
  const candidates = [
    path.join(desktopRoot, 'node_modules', '.bin', name + ext),
    path.join(desktopRoot, '..', 'node_modules', '.bin', name + ext),
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return path.resolve(candidate);
  }
  return name;
}

function resolveElectronLaunch() {
  const bin = resolveLocalBin('electron');
  if (bin !== 'electron') {
    return { command: bin, args: ['.'] };
  }

  const cliCandidates = [
    path.join(desktopRoot, 'node_modules', 'electron', 'cli.js'),
    path.join(desktopRoot, '..', 'node_modules', 'electron', 'cli.js'),
  ];
  for (const cli of cliCandidates) {
    if (fs.existsSync(cli)) {
      return { command: process.execPath, args: [cli, '.'] };
    }
  }

  return null;
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

/** Kill orphaned Electron processes from a prior Tilt/desktop session (Windows file-lock fix). */
function stopStaleElectron() {
  const electronMarker = path.resolve(desktopRoot, '..', 'node_modules', 'electron');
  if (process.platform === 'win32') {
    const marker = electronMarker.replace(/\\/g, '\\\\').replace(/'/g, "''");
    const script = `
      Get-CimInstance Win32_Process -Filter "Name = 'electron.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.ExecutablePath -and $_.ExecutablePath -like '*${marker}*' } |
        ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
    `.trim();
    spawnSync('powershell', ['-NoProfile', '-NonInteractive', '-Command', script], {
      cwd: desktopRoot,
      stdio: 'pipe',
      shell: false,
    });
  } else {
    spawnSync('pkill', ['-f', electronMarker], { cwd: desktopRoot, stdio: 'pipe' });
  }
}

function runElectron() {
  const launch = resolveElectronLaunch();
  if (!launch) {
    console.error(
      '[dev-tilt] Electron not found. From client/: yarn install && cd desktop && npm install',
    );
    console.error(
      '[dev-tilt] Then: node scripts/ensure-electron-dist.cjs',
    );
    return Promise.resolve(1);
  }

  const env = {
    ...process.env,
    ELECTRON_DISABLE_SANDBOX: '1',
  };

  return new Promise((resolve) => {
    const child = spawn(launch.command, launch.args, {
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

function getSetupFingerprint() {
  const parts = [];
  for (const file of SETUP_WATCH_FILES) {
    if (fs.existsSync(file)) {
      const st = fs.statSync(file);
      parts.push(`${file}:${st.mtimeMs}`);
    }
  }
  return parts.join('|');
}

function needsHeavySetup() {
  if (process.env.TILT_DESKTOP_FORCE_SETUP === '1') return true;
  if (!fs.existsSync(SETUP_STAMP)) return true;
  try {
    const stamp = JSON.parse(fs.readFileSync(SETUP_STAMP, 'utf8'));
    return stamp.fingerprint !== getSetupFingerprint();
  } catch {
    return true;
  }
}

function markSetupDone() {
  fs.writeFileSync(
    SETUP_STAMP,
    JSON.stringify({ fingerprint: getSetupFingerprint(), at: new Date().toISOString() }),
  );
}

function runHeavySetup() {
  runSync('build:server', ['run', 'build:server']);
  markSetupDone();
}

function blockUntilTiltRestart(reason) {
  console.log(`[dev-tilt] ${reason}`);
  console.log('[dev-tilt] Use Restart in the Tilt dashboard to try again.');
  if (process.stdin.isTTY) {
    process.stdin.resume();
  }
  return new Promise(() => {});
}

async function main() {
  stopStaleElectron();
  await sleep(1500);

  if (needsHeavySetup()) {
    console.log('[dev-tilt] Running one-time native + server setup...');
    runHeavySetup();
  } else {
    console.log(
      '[dev-tilt] Skipping native rebuild (unchanged). Set TILT_DESKTOP_FORCE_SETUP=1 to redo.',
    );
  }

  let crashCount = 0;

  while (true) {
    runSync('compile', ['run', 'compile']);
    try {
      const { port } = await waitForFrontendReady({
        warmup: true,
        logPrefix: '[dev-tilt]',
        timeoutMs: 360_000,
      });
      console.log(
        `[dev-tilt] Electron will load live Next.js on port ${port} (Tilt \`web\` resource).`,
      );
      console.log(
        '[dev-tilt] Packaged Vite UI (desktop-renderer) is not used in dev — run build:desktop:ui to refresh it for packages.',
      );
    } catch (err) {
      console.error(err.message || err);
      await blockUntilTiltRestart('Frontend is not ready — fix `web` first, then Restart `desktop`.');
      return;
    }
    const code = await runElectron();

    if (code === 0) {
      crashCount = 0;
      console.log('[dev-tilt] Electron closed — relaunching in 2s (disable `desktop` in Tilt to stop).');
      await sleep(2000);
      continue;
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
