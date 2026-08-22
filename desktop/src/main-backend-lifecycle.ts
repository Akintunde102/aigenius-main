import { app } from 'electron';
import fs from 'fs';
import path from 'path';
import http from 'http';
import net from 'net';
import crypto from 'crypto';
import { DEV_LOOPBACK_HOST, loopbackHttpUrl } from './loopback-host';
import { resolveUpstreamApiUrl as resolveDesktopUpstreamApiUrl } from './resolve-upstream-api-url';
import { MINI_SERVER_PORT } from './mini-server-port';
import { desktopUiAppUrl, shouldUseDesktopUiCustomProtocol } from './desktop-ui-mode';
import {
  killManagedDesktopChild,
  spawnDesktopChild,
  type ManagedDesktopChild,
} from './desktop-child-process';
import { startIndexerUtilityProcess, stopIndexerUtilityProcess } from './indexer-utility-process';
import { resolveFrontendPort } from './frontend-port';

export const INDEXER_IPC_PORT = process.env.AIGENIUS_INDEXER_IPC_PORT ?? '18012';
export const FRONTEND_PORT = resolveFrontendPort();
export const SECRET_TOKEN =
  (typeof process.env.AIGENIUS_SECRET_TOKEN === 'string' &&
    process.env.AIGENIUS_SECRET_TOKEN.trim().length > 0 &&
    process.env.AIGENIUS_SECRET_TOKEN) ||
  crypto.randomBytes(32).toString('hex');
process.env.AIGENIUS_SECRET_TOKEN = SECRET_TOKEN;
export const FRONTEND_URL = shouldUseDesktopUiCustomProtocol()
  ? desktopUiAppUrl('/desktop-login')
  : `${loopbackHttpUrl(FRONTEND_PORT, '/desktop-login')}?aigenius_shell=1`;

export const children: ManagedDesktopChild[] = [];

export function repoRootFromDesktopDist(): string {
  return path.join(__dirname, '..', '..');
}

export function desktopServerDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'desktop-server');
  }
  return path.join(repoRootFromDesktopDist(), 'desktop-server');
}

export function desktopServerEntry(): string {
  if (app.isPackaged) {
    return path.join(desktopServerDir(), 'index.js');
  }
  return path.join(desktopServerDir(), 'dist', 'index.js');
}

export function resolveUpstreamApiUrl(): string {
  return resolveDesktopUpstreamApiUrl({
    desktopRoot: path.join(__dirname, '..'),
    packagedResourcesPath: app.isPackaged ? process.resourcesPath : undefined,
  });
}

type DesktopUiMode = 'vite' | 'next';

export function desktopUiMode(): DesktopUiMode {
  const raw = process.env.AIGENIUS_DESKTOP_UI?.trim().toLowerCase();
  if (raw === 'next') {
    return 'next';
  }
  return 'vite';
}

export function nextStandaloneDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'next-standalone');
  }
  return path.join(repoRootFromDesktopDist(), 'frontend', '.next', 'standalone');
}

export function desktopUiStaticDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'desktop-ui');
  }
  return path.join(repoRootFromDesktopDist(), 'desktop-renderer', 'dist');
}

export function resolveDesktopUiServerLaunch(): { scriptPath: string; cwd: string } {
  if (app.isPackaged) {
    const cwd = path.join(process.resourcesPath, 'desktop-ui-server');
    return {
      scriptPath: path.join(cwd, 'serve-desktop-ui.cjs'),
      cwd,
    };
  }
  const cwd = path.join(__dirname, '..', 'scripts');
  return {
    scriptPath: path.join(cwd, 'serve-desktop-ui.cjs'),
    cwd,
  };
}

/** Monorepo Next standalone output nests `server.js` under `frontend/`. */
export function resolveNextStandaloneLaunch(): { scriptPath: string; cwd: string } {
  const root = nextStandaloneDir();
  const nestedDir = path.join(root, 'frontend');
  const nestedScript = path.join(nestedDir, 'server.js');
  if (fs.existsSync(nestedScript)) {
    return { scriptPath: nestedScript, cwd: nestedDir };
  }
  return { scriptPath: path.join(root, 'server.js'), cwd: root };
}

export function waitForHttpUntil(
  url: string,
  timeoutMs: number,
  intervalMs: number,
  statusOk: (statusCode: number | undefined) => boolean,
): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  return new Promise((resolve, reject) => {
    const tryOnce = (): void => {
      const req = http.get(url, (res) => {
        res.resume();
        if (statusOk(res.statusCode)) {
          resolve();
          return;
        }
        retry();
      });
      req.on('error', () => retry());
      req.setTimeout(intervalMs, () => {
        req.destroy();
        retry();
      });
    };
    const retry = (): void => {
      if (Date.now() > deadline) {
        reject(new Error(`Timeout waiting for ${url}`));
        return;
      }
      setTimeout(tryOnce, intervalMs);
    };
    tryOnce();
  });
}

/** Mini-server / generic probe: accept any response that is not a server error. */
export function waitForHttpOk(url: string, timeoutMs: number, intervalMs: number): Promise<void> {
  return waitForHttpUntil(
    url,
    timeoutMs,
    intervalMs,
    (code) => code !== undefined && code < 500,
  );
}

/** Next page: require a real document response (avoid treating 404 as “ready” → blank window). */
export function waitForFrontendPageReady(url: string, timeoutMs: number, intervalMs: number): Promise<void> {
  return waitForHttpUntil(
    url,
    timeoutMs,
    intervalMs,
    (code) => code !== undefined && code >= 200 && code < 400,
  );
}

export function killChildren(): void {
  for (const c of children) {
    killManagedDesktopChild(c);
  }
  children.length = 0;
  stopIndexerUtilityProcess();
}

export let appShutdownStarted = false;

export function markAppShutdownStarted(): void {
  appShutdownStarted = true;
}

export function isAppShutdownStarted(): boolean {
  return appShutdownStarted;
}

export async function shutdownDesktopApp(): Promise<void> {
  try {
    await fetch(loopbackHttpUrl(MINI_SERVER_PORT, '/search/shutdown'), {
      method: 'POST',
      headers: { Authorization: `Bearer ${SECRET_TOKEN}`, 'Content-Length': '0' },
      signal: AbortSignal.timeout(2000),
    });
  } catch {
    /* sidecar may already be gone or not started — always proceed */
  }
  killChildren();
}

export function desktopIndexerEntry(): string {
  if (app.isPackaged) {
    return path.join(desktopServerDir(), 'indexer-main.js');
  }
  return path.join(desktopServerDir(), 'dist', 'indexer-main.js');
}

export async function waitForIndexerIpc(port: string, timeoutMs = 60_000): Promise<void> {
  const host = '127.0.0.1';
  const portNum = Number.parseInt(port, 10);
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const ok = await new Promise<boolean>((resolve) => {
      const socket = net.createConnection({ host, port: portNum }, () => {
        const payload = JSON.stringify({ id: 'ping', op: 'ping' });
        socket.write(`${payload}\n`);
      });
      let buffer = '';
      socket.on('data', (chunk) => {
        buffer += chunk.toString('utf8');
        if (buffer.includes('\n')) {
          socket.end();
          resolve(true);
        }
      });
      socket.on('error', () => resolve(false));
      setTimeout(() => {
        socket.destroy();
        resolve(false);
      }, 2_000);
    });
    if (ok) return;
    await new Promise((r) => setTimeout(r, 250));
  }
  throw new Error(`Indexer IPC not ready on ${host}:${port} after ${timeoutMs}ms`);
}

export async function startIndexerProcess(userDataPath: string, modelsDir: string, token: string, logsDir: string): Promise<void> {
  if (process.env.AIGENIUS_EXTERNAL_INDEXER === '0') {
    return;
  }
  const entry = desktopIndexerEntry();
  if (!fs.existsSync(entry)) {
    console.warn('[aigenius-desktop] Indexer entry missing; skipping utility process:', entry);
    return;
  }
  startIndexerUtilityProcess({
    desktopServerDir: desktopServerDir(),
    userDataPath,
    modelsDir,
    secretToken: token,
    ipcPort: INDEXER_IPC_PORT,
    logsDir,
  });
  await waitForIndexerIpc(INDEXER_IPC_PORT, 90_000);
}

type DeferredIndexerContext = {
  userDataPath: string;
  modelsDir: string;
  token: string;
  logsDir: string;
};

let deferredIndexerContext: DeferredIndexerContext | null = null;
let indexerStartScheduled = false;

/** Start the indexer utility process after the shell window has finished loading (non-blocking). */
export function scheduleIndexerStartAfterShellReady(): void {
  if (indexerStartScheduled) {
    return;
  }
  indexerStartScheduled = true;
  if (process.env.AIGENIUS_EXTERNAL_INDEXER === '0' || !deferredIndexerContext) {
    return;
  }
  const ctx = deferredIndexerContext;
  console.info('[aigenius-desktop] Shell ready — starting indexer utility process in background.');
  void startIndexerProcess(ctx.userDataPath, ctx.modelsDir, ctx.token, ctx.logsDir).catch((err) => {
    console.error('[aigenius-desktop] Deferred indexer start failed:', err);
  });
}

export function miniServerChildEnv(
  base: NodeJS.ProcessEnv,
  opts: {
    miniPort: string;
    userDataPath: string;
    dbPath: string;
    modelsDir: string;
    token: string;
  },
): NodeJS.ProcessEnv {
  return {
    ...base,
    PORT: opts.miniPort,
    HOST: DEV_LOOPBACK_HOST,
    AIGENIUS_FRONTEND_PORT: FRONTEND_PORT,
    DEV_WEB_PORT: FRONTEND_PORT,
    AIGENIUS_USER_DATA_PATH: opts.userDataPath,
    ...(process.env.AIGENIUS_SKIP_SEARCH === '1' ? {} : { AIGENIUS_DB_PATH: opts.dbPath }),
    AIGENIUS_MODELS_DIR: opts.modelsDir,
    AIGENIUS_TREE_SITTER: '1',
    AIGENIUS_EXTERNAL_INDEXER: process.env.AIGENIUS_EXTERNAL_INDEXER === '0' ? '0' : '1',
    AIGENIUS_INDEXER_IPC_PORT: INDEXER_IPC_PORT,
    AIGENIUS_SECRET_TOKEN: opts.token,
    AIGENIUS_UPSTREAM_API_URL: resolveUpstreamApiUrl(),
    /** Off by default in the desktop shell — set AIGENIUS_ENABLE_STT=1 to restore local Whisper. */
    AIGENIUS_ENABLE_STT: process.env.AIGENIUS_ENABLE_STT ?? '0',
    /** Active code project only unless explicitly re-enabled. */
    AIGENIUS_HOMEDIR_INDEX: process.env.AIGENIUS_HOMEDIR_INDEX ?? '0',
  };
}

export async function startBackendProcesses(): Promise<void> {
  const miniPort = MINI_SERVER_PORT;
  const serverEntry = desktopServerEntry();
  const userDataPath = app.getPath('userData');
  const dbPath = path.join(userDataPath, 'search-index.sqlite');
  const modelsDir = path.join(__dirname, 'models');

  const logsDir = app.getPath('logs');
  if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
  }

  const useExternalServer = process.env.AIGENIUS_EXTERNAL_MINI_SERVER === '1';
  const token = process.env.AIGENIUS_SECRET_TOKEN || SECRET_TOKEN;

  if (!useExternalServer) {
    children.push(
      spawnDesktopChild(serverEntry, {
        cwd: desktopServerDir(),
        serviceName: 'aigenius-mini-server',
        env: miniServerChildEnv(process.env, {
          miniPort,
          userDataPath,
          dbPath,
          modelsDir,
          token,
        }),
        logPath: path.join(logsDir, 'mini-server.log'),
      }),
    );
  } else {
    console.info('[aigenius-desktop] Using external mini-server (Docker). Skipping local spawn.');
  }

  if (app.isPackaged && !shouldUseDesktopUiCustomProtocol()) {
    if (desktopUiMode() === 'next') {
      const { scriptPath: serverJs, cwd: nextCwd } = resolveNextStandaloneLaunch();
      children.push(
        spawnDesktopChild(serverJs, {
          cwd: nextCwd,
          serviceName: 'aigenius-next',
          env: {
            ...process.env,
            PORT: FRONTEND_PORT,
            HOSTNAME: DEV_LOOPBACK_HOST,
            NODE_ENV: 'production',
          },
          logPath: path.join(logsDir, 'frontend.log'),
        }),
      );
    } else {
      const { scriptPath: uiServer, cwd: uiCwd } = resolveDesktopUiServerLaunch();
      children.push(
        spawnDesktopChild(uiServer, {
          cwd: uiCwd,
          serviceName: 'aigenius-desktop-ui',
          env: {
            ...process.env,
            PORT: FRONTEND_PORT,
            HOSTNAME: DEV_LOOPBACK_HOST,
            AIGENIUS_DESKTOP_UI_ROOT: desktopUiStaticDir(),
            NODE_ENV: 'production',
          },
          logPath: path.join(logsDir, 'frontend.log'),
        }),
      );
    }
  }

  const useCustomUiProtocol = shouldUseDesktopUiCustomProtocol();
  const frontendWaitMs = app.isPackaged ? 120_000 : 180_000;
  const waitTargets: Promise<void>[] = [
    waitForHttpOk(loopbackHttpUrl(miniPort, '/health'), 60_000, 1000),
  ];
  if (!useCustomUiProtocol) {
    waitTargets.push(waitForFrontendPageReady(FRONTEND_URL, frontendWaitMs, 400));
  }
  await Promise.all(waitTargets);

  deferredIndexerContext = { userDataPath, modelsDir, token, logsDir };
}
