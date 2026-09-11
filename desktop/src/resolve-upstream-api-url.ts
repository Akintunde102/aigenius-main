import fs from 'fs';
import path from 'path';

const LEGACY_DEFAULT_UPSTREAM = 'http://localhost:8000';

const HOSTED_PRODUCTION_API_HOSTS = new Set([
  'aigenius-api.noboxlabs.xyz',
  'api.aigenius.noboxlabs.xyz',
]);

function readPackageEnvUpstream(desktopRoot: string): string | undefined {
  const packageEnvPath = path.join(desktopRoot, 'package.env');
  if (!fs.existsSync(packageEnvPath)) {
    return undefined;
  }

  for (const line of fs.readFileSync(packageEnvPath, 'utf8').split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const eq = trimmed.indexOf('=');
    if (eq < 0) {
      continue;
    }
    const key = trimmed.slice(0, eq).trim();
    const value = trimmed.slice(eq + 1).trim().replace(/^['"]|['"]$/g, '');
    if (key === 'AIGENIUS_UPSTREAM_API_URL' && value) {
      return value;
    }
  }

  return undefined;
}

function readPackagedRuntimeUpstream(resourcesPath: string): string | undefined {
  try {
    const configPath = path.join(resourcesPath, 'package-runtime.json');
    if (!fs.existsSync(configPath)) {
      return undefined;
    }
    const parsed = JSON.parse(fs.readFileSync(configPath, 'utf8')) as { upstreamApiUrl?: string };
    const value = parsed?.upstreamApiUrl?.trim();
    return value || undefined;
  } catch {
    return undefined;
  }
}

function readDevPortsApiUrl(desktopRoot: string): string | undefined {
  try {
    const portsPath = path.join(desktopRoot, '..', '..', '.dev-ports.json');
    if (!fs.existsSync(portsPath)) {
      return undefined;
    }
    const parsed = JSON.parse(fs.readFileSync(portsPath, 'utf8')) as { api?: number };
    const port = parsed?.api;
    if (typeof port === 'number' && port > 0) {
      return `http://127.0.0.1:${port}`;
    }
  } catch {
    /* ignore */
  }
  return undefined;
}

function upstreamFromDevApiPort(): string | undefined {
  const raw = process.env.AIGENIUS_API_PORT ?? process.env.DEV_API_PORT;
  const port = raw?.trim();
  if (!port) {
    return undefined;
  }
  return `http://127.0.0.1:${port}`;
}

export function isHostedProductionApiUrl(url: string): boolean {
  try {
    return HOSTED_PRODUCTION_API_HOSTS.has(new URL(url).hostname);
  } catch {
    return false;
  }
}

function isLocalApiUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '[::1]';
  } catch {
    return false;
  }
}

function resolveDevUpstreamApiUrl(desktopRoot: string): string {
  const fromDevPort = upstreamFromDevApiPort();
  if (fromDevPort) {
    return fromDevPort;
  }

  const fromPortsFile = readDevPortsApiUrl(desktopRoot);
  if (fromPortsFile) {
    return fromPortsFile;
  }

  return LEGACY_DEFAULT_UPSTREAM;
}

export type ResolveUpstreamApiUrlOptions = {
  /** Desktop package root (`client/desktop`). Defaults to parent of compiled `dist/`. */
  desktopRoot?: string;
  /** Electron `process.resourcesPath` when packaged. */
  packagedResourcesPath?: string;
  /** When false (Tilt / unpackaged dev), never use hosted production URLs from package.env. */
  packaged?: boolean;
};

/**
 * Nest API base URL for OAuth and mini-server proxying.
 *
 * **Development (unpackaged):** local Tilt API only — `AIGENIUS_API_PORT`, `.dev-ports.json`,
 * or legacy `http://localhost:8000`. Ignores `desktop/package.env` production URLs.
 *
 * **Packaged app:** `AIGENIUS_UPSTREAM_API_URL` → `package.env` → `package-runtime.json` → legacy default.
 */
export function resolveUpstreamApiUrl(options: ResolveUpstreamApiUrlOptions = {}): string {
  const desktopRoot =
    options.desktopRoot ?? path.join(__dirname, '..');
  const isPackaged = options.packaged === true;

  if (!isPackaged) {
    const fromEnv = process.env.AIGENIUS_UPSTREAM_API_URL?.trim();
    if (fromEnv) {
      if (isLocalApiUrl(fromEnv)) {
        return fromEnv;
      }
      if (isHostedProductionApiUrl(fromEnv)) {
        console.warn(
          '[aigenius-desktop] Ignoring hosted production AIGENIUS_UPSTREAM_API_URL in dev; using local API.',
        );
      }
    }
    return resolveDevUpstreamApiUrl(desktopRoot);
  }

  const fromEnv = process.env.AIGENIUS_UPSTREAM_API_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  const fromPackageEnv = readPackageEnvUpstream(desktopRoot)?.trim();
  if (fromPackageEnv) {
    return fromPackageEnv;
  }

  if (options.packagedResourcesPath) {
    const fromRuntime = readPackagedRuntimeUpstream(options.packagedResourcesPath)?.trim();
    if (fromRuntime) {
      return fromRuntime;
    }
  }

  return LEGACY_DEFAULT_UPSTREAM;
}

export { LEGACY_DEFAULT_UPSTREAM };
