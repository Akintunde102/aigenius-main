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

// Module-level ref to the active Electron child so signal handlers can kill it.
let activeElectronChild = null;

/**
 * Kill a child process and its whole subtree.
 * On Windows `shell: true` creates an intermediate cmd.exe, so we use
 * `taskkill /F /T /PID` to terminate the entire process tree.
 */
function killElectronChild(child) {
  if (!child) return;
  try {
    if (process.platform === 'win32') {
      spawnSync('taskkill', ['/F', '/T', '/PID', String(child.pid)], { stdio: 'pipe' });
    } else {
      child.kill('SIGKILL');
    }
  } catch {
    // process may already be gone
  }
}

// Register once — propagate termination signals to Electron before dev-tilt exits.
function registerCleanupHandlers() {
  function onExit() {
    killElectronChild(activeElectronChild);
    stopStaleElectron();
  }
  process.once('SIGTERM', () => { onExit(); process.exit(0); });
  process.once('SIGINT',  () => { onExit(); process.exit(0); });
  // 'exit' fires even after uncaught exceptions; covers crash paths.
  process.on('exit', onExit);
}
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
  const exeName = process.platform === 'win32' ? 'electron.exe' : 'electron';
  const distCandidates = [
    path.join(desktopRoot, 'node_modules', 'electron', 'dist', exeName),
    path.join(desktopRoot, '..', 'node_modules', 'electron', 'dist', exeName),
  ];
  for (const exe of distCandidates) {
    if (fs.existsSync(exe)) {
      return { command: path.resolve(exe), args: ['.'] };
    }
  }

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

/**
 * Kill orphaned Electron processes from a prior Tilt/desktop session.
 *
 * On Windows we use two independent strategies so that a miss by one
 * is caught by the other:
 *   1. Match by ExecutablePath containing the local node_modules/electron path
 *      (catches normal electron.cmd-launched processes).
 *   2. Match by CommandLine containing the desktopRoot working directory
 *      (catches processes launched via node cli.js or any other shim).
 * Both are run unconditionally; overlapping kills are harmless (SilentlyContinue).
 */
function stopStaleElectron() {
  const electronMarker = path.resolve(desktopRoot, '..', 'node_modules', 'electron');
  if (process.platform === 'win32') {
    // Strategy 1: match by path to electron binary inside node_modules
    const q = (value) => `'${String(value).replace(/'/g, "''")}'`;
    const marker1 = path.resolve(electronMarker);
    const marker2 = path.resolve(desktopRoot);
    const script = `
      $m1 = ${q(marker1)}
      $m2 = ${q(marker2)}
      $procs = Get-CimInstance Win32_Process -Filter "Name = 'electron.exe'" -ErrorAction SilentlyContinue
      $procs | Where-Object {
        ($_.ExecutablePath -and $_.ExecutablePath.Contains($m1)) -or
        ($_.CommandLine   -and $_.CommandLine.Contains($m2))
      } | ForEach-Object { Stop-Process -Id $_.ProcessId -Force -ErrorAction SilentlyContinue }
      Get-CimInstance Win32_Process -Filter "Name = 'wscript.exe'" -ErrorAction SilentlyContinue |
        Where-Object { $_.CommandLine -and $_.CommandLine.Contains('.tilt-launch-electron.vbs') } |
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

function runElectronViaStartProcess(launch, env) {
  // Tilt's hidden console (SW_HIDE) is inherited by spawn/`start`/ShellExecute.
  // A scheduled task with an Interactive logon token maps a real HWND.
  const launcher = path.join(__dirname, 'launch-electron-windows.ps1');
  const spawnArgs = [
    '-NoProfile',
    '-STA',
    '-ExecutionPolicy', 'Bypass',
    '-File', launcher,
    '-Exe', launch.command,
    '-WorkDir', desktopRoot,
    '-AppArgs', ...launch.args,
  ];
  console.log(`[dev-tilt] Windows HWND workaround: powershell ${spawnArgs.join(' ')}`);

  return new Promise((resolve) => {
    const child = spawn('powershell.exe', spawnArgs, {
      cwd: desktopRoot,
      stdio: 'inherit',
      env,
      shell: false,
      windowsHide: false,
    });
    activeElectronChild = child;
    child.on('error', (err) => {
      console.error('[dev-tilt] Failed to start Electron via Windows launcher:', err.message);
      activeElectronChild = null;
      resolve(1);
    });
    child.on('close', (code, signal) => {
      activeElectronChild = null;
      if (signal) {
        resolve(128);
        return;
      }
      resolve(code ?? 1);
    });
  });
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

  console.log(`[dev-tilt] launching ${launch.command} ${launch.args.join(' ')}`);

  // Tilt's Windows process spawn uses CREATE_NO_WINDOW. Electron inherited that
  // and never mapped an HWND (visible:true in JS, zero windows in EnumWindows).
  // Start-Process uses ShellExecute, which creates a normal interactive window.
  if (process.platform === 'win32') {
    return runElectronViaStartProcess(launch, env);
  }

  return new Promise((resolve) => {
    const child = spawn(launch.command, launch.args, {
      cwd: desktopRoot,
      stdio: 'inherit',
      env,
      shell: false,
    });
    activeElectronChild = child;
    child.on('error', (err) => {
      console.error('[dev-tilt] Failed to start Electron:', err.message);
      activeElectronChild = null;
      resolve(1);
    });
    child.on('close', (code, signal) => {
      activeElectronChild = null;
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
  registerCleanupHandlers();
  stopStaleElectron();
  // Give the OS time to release the single-instance lock file after the kill.
  // 1.5s was occasionally too short on Windows — bumped to 3s.
  await sleep(3000);

  if (needsHeavySetup()) {
    console.log('[dev-tilt] Running one-time native + server setup...');
    runHeavySetup();
  } else {
    console.log(
      '[dev-tilt] Skipping native rebuild (unchanged). Set TILT_DESKTOP_FORCE_SETUP=1 to redo.',
    );
  }

  let crashCount = 0;
  // Tracks consecutive single-instance lock collisions (exit code 2).
  // Happens when a stale Electron process still holds the lock despite stopStaleElectron().
  let lockCollisionCount = 0;
  const MAX_LOCK_RETRIES = 5;

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

    const launchTs = Date.now();
    const code = await runElectron();
    const uptimeMs = Date.now() - launchTs;

    // Exit code 2 = single-instance lock still held by a stale process.
    // This is distinct from a clean user close (0) and a crash (other).
    // We kill the stale process again and retry rather than looping silently.
    if (code === 2) {
      lockCollisionCount += 1;
      if (lockCollisionCount >= MAX_LOCK_RETRIES) {
        await blockUntilTiltRestart(
          `Electron could not acquire the single-instance lock after ${MAX_LOCK_RETRIES} attempts. ` +
          'Another AIGenius process may be running. Kill it manually and Restart this resource.',
        );
        return;
      }
      console.warn(
        `[dev-tilt] Electron exited immediately (single-instance lock held by stale process); ` +
        `attempt ${lockCollisionCount}/${MAX_LOCK_RETRIES} — killing stale processes and retrying in 3s...`,
      );
      stopStaleElectron();
      await sleep(3000);
      continue;
    }

    // Reset lock collision counter on any non-2 exit.
    lockCollisionCount = 0;

    if (code === 0) {
      crashCount = 0;
      // Guard against a silent near-instant exit that looks like a clean close
      // but is actually an undetected lock issue or early crash (< 2s uptime).
      if (uptimeMs < 2000) {
        console.warn(
          '[dev-tilt] Electron exited cleanly but very quickly — may be a lock collision or early crash. ' +
          'Retrying in 3s...',
        );
        stopStaleElectron();
        await sleep(3000);
        continue;
      }
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
