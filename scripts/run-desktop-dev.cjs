'use strict';

/**
 * Desktop dev: start the Next dev server if needed, wait for shell routes, then launch Electron.
 */
const path = require('path');
const { spawn } = require('child_process');
const { clientRoot } = require('./lib/resolve-backend.cjs');
const { runNpm } = require('./lib/run.cjs');
const {
  resolveFrontendPort,
  waitForFrontendReady,
  httpStatus,
  isPageReady,
  DESKTOP_SHELL_ENTRY,
  desktopUrl,
} = require('../../scripts/ensure-frontend-ready.cjs');

const desktopDir = path.join(clientRoot, 'desktop');
const frontendDir = path.join(clientRoot, 'frontend');
const serverDir = path.join(clientRoot, 'desktop-server');

function bindShutdown(children) {
  let stopping = false;
  const stop = () => {
    if (stopping) return;
    stopping = true;
    for (const child of children) {
      if (child && !child.killed) child.kill();
    }
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);
  return stop;
}

async function isFrontendAlreadyReady() {
  const port = resolveFrontendPort();
  const code = await httpStatus(desktopUrl(port, DESKTOP_SHELL_ENTRY), 3000);
  return isPageReady(code);
}

function startFrontendDev() {
  const port = resolveFrontendPort();
  const env = {
    ...process.env,
    PORT: port,
    DEV_WEB_PORT: port,
    AIGENIUS_FRONTEND_PORT: port,
  };

  console.log(`[desktop:dev] starting Next dev server on port ${port}...`);
  return spawn('npm', ['run', 'dev'], {
    cwd: frontendDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env,
  });
}

async function main() {
  const installCode = runNpm(['install'], desktopDir);
  if (installCode !== 0) process.exit(installCode);

  const serverInstallCode = runNpm(['install', '--ignore-scripts'], serverDir);
  if (serverInstallCode !== 0) process.exit(serverInstallCode);

  const children = [];
  const stop = bindShutdown(children);

  let startedFrontend = false;
  if (!(await isFrontendAlreadyReady())) {
    const frontendChild = startFrontendDev();
    children.push(frontendChild);
    startedFrontend = true;
    frontendChild.on('error', (err) => {
      console.error('[desktop:dev] Failed to start frontend:', err.message);
      stop();
      process.exit(1);
    });
  } else {
    console.log('[desktop:dev] Next dev server already running.');
  }

  try {
    await waitForFrontendReady({
      warmup: true,
      logPrefix: '[desktop:dev]',
      timeoutMs: 180_000,
    });
  } catch (err) {
    console.error(err.message || err);
    stop();
    process.exit(1);
  }

  const desktopChild = spawn('npm', ['run', 'dev'], {
    cwd: desktopDir,
    stdio: 'inherit',
    shell: process.platform === 'win32',
    env: process.env,
  });
  children.push(desktopChild);

  desktopChild.on('error', (err) => {
    console.error('[desktop:dev] Failed to start Electron:', err.message);
    stop();
    process.exit(1);
  });

  desktopChild.on('exit', (code) => {
    stop();
    process.exit(code ?? 1);
  });

  if (startedFrontend) {
    console.log('[desktop:dev] Electron running — frontend and desktop share this terminal (Ctrl+C stops both).');
  }
}

main().catch((err) => {
  console.error('[desktop:dev]', err.message || err);
  process.exit(1);
});
