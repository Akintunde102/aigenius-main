import fs from 'fs';
import path from 'path';

const LEGACY_DEFAULT_UPSTREAM = 'http://localhost:8000';

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

function upstreamFromDevApiPort(): string | undefined {
  const raw = process.env.AIGENIUS_API_PORT ?? process.env.DEV_API_PORT;
  const port = raw?.trim();
  if (!port) {
    return undefined;
  }
  return `http://127.0.0.1:${port}`;
}

export type ResolveUpstreamApiUrlOptions = {
  /** Desktop package root (`client/desktop`). Defaults to parent of compiled `dist/`. */
  desktopRoot?: string;
  /** Electron `process.resourcesPath` when packaged. */
  packagedResourcesPath?: string;
};

/**
 * Nest API base URL for OAuth and mini-server proxying.
 *
 * Resolution order:
 * 1. `AIGENIUS_UPSTREAM_API_URL`
 * 2. `http://127.0.0.1:{AIGENIUS_API_PORT|DEV_API_PORT}` (Tilt dev — wins over `package.env`)
 * 3. `desktop/package.env`
 * 4. Packaged `package-runtime.json`
 * 5. Legacy default `http://localhost:8000`
 */
export function resolveUpstreamApiUrl(options: ResolveUpstreamApiUrlOptions = {}): string {
  const fromEnv = process.env.AIGENIUS_UPSTREAM_API_URL?.trim();
  if (fromEnv) {
    return fromEnv;
  }

  // const fromDevPort = upstreamFromDevApiPort();
  // if (fromDevPort) {
  //   return fromDevPort;
  // }

  const desktopRoot =
    options.desktopRoot ?? path.join(__dirname, '..');

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
