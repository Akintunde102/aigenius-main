import fs from 'fs';
import path from 'path';

export type TsPathMapping = {
  prefix: string;
  suffix: string;
  targets: string[];
};

export type TsConfigPaths = {
  configDir: string;
  baseUrl: string;
  mappings: TsPathMapping[];
};

const configCache = new Map<string, TsConfigPaths | null>();

function findTsConfigDir(startPath: string): string | null {
  let dir = path.dirname(path.resolve(startPath));
  const root = path.parse(dir).root;
  while (true) {
    const candidate = path.join(dir, 'tsconfig.json');
    if (fs.existsSync(candidate)) return dir;
    if (dir === root) break;
    dir = path.dirname(dir);
  }
  return null;
}

function parseTsConfig(configPath: string, seen = new Set<string>()): TsConfigPaths | null {
  const norm = path.normalize(configPath);
  if (seen.has(norm)) return null;
  seen.add(norm);

  let raw: { compilerOptions?: { baseUrl?: string; paths?: Record<string, string[]> }; extends?: string };
  try {
    raw = JSON.parse(fs.readFileSync(configPath, 'utf8')) as typeof raw;
  } catch {
    return null;
  }

  const configDir = path.dirname(configPath);
  let baseUrl = path.resolve(configDir, raw.compilerOptions?.baseUrl ?? '.');
  const mappings: TsPathMapping[] = [];

  if (raw.extends) {
    const parentPath = path.resolve(configDir, raw.extends);
    const parent = parseTsConfig(
      parentPath.endsWith('.json') ? parentPath : `${parentPath}.json`,
      seen,
    );
    if (parent) {
      baseUrl = parent.baseUrl;
      mappings.push(...parent.mappings);
    }
  }

  for (const [pattern, targets] of Object.entries(raw.compilerOptions?.paths ?? {})) {
    const star = pattern.indexOf('*');
    if (star < 0) continue;
    mappings.push({
      prefix: pattern.slice(0, star),
      suffix: pattern.slice(star + 1),
      targets: targets ?? [],
    });
  }

  return { configDir, baseUrl, mappings };
}

export function loadTsConfigPaths(importerFile: string): TsConfigPaths | null {
  const configDir = findTsConfigDir(importerFile);
  if (!configDir) return null;
  const key = configDir;
  if (configCache.has(key)) return configCache.get(key) ?? null;
  const parsed = parseTsConfig(path.join(configDir, 'tsconfig.json'));
  configCache.set(key, parsed);
  return parsed;
}

/** Map a module specifier (e.g. `@/lib/foo`) to an absolute path without extension. */
export function resolveTsConfigAlias(
  importerFile: string,
  moduleSpec: string,
): string | null {
  const spec = moduleSpec.trim();
  if (!spec || spec.startsWith('.') || spec.startsWith('/') || spec.startsWith('node:')) {
    return null;
  }

  const cfg = loadTsConfigPaths(importerFile);
  if (!cfg) return null;

  for (const { prefix, suffix, targets } of cfg.mappings) {
    if (!spec.startsWith(prefix)) continue;
    if (suffix && !spec.endsWith(suffix)) continue;
    const matched = spec.slice(prefix.length, suffix ? spec.length - suffix.length : undefined);
    for (const target of targets) {
      const mapped = target.replace('*', matched);
      const candidate = path.resolve(cfg.baseUrl, mapped);
      if (candidate) return candidate;
    }
  }

  return null;
}

export function clearTsConfigPathsCache(): void {
  configCache.clear();
}
