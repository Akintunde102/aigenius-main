import { loopbackHttpOrigin } from '../../loopback-host';
import { sidecarFetch } from '../../sidecar-fetch';
import { getActiveCodeProjectRootPath } from '../../active-code-project';

const MINI_SERVER_PORT = Number(process.env.AIGENIUS_MINI_SERVER_PORT ?? 3847);
const SERVER_URL = loopbackHttpOrigin(MINI_SERVER_PORT);

function sidecarAuthHeaders(): Record<string, string> {
  const token = process.env.AIGENIUS_SECRET_TOKEN;
  return token ? { 'x-aigenius-secret': token } : {};
}

export type SymbolLineRange = {
  name: string;
  kind: string;
  line_start: number;
  line_end: number;
  signature?: string;
};

export type SymbolAnchorResolution =
  | { ok: true; range: SymbolLineRange; resolvedVia: 'symbolAnchor' }
  | { ok: false; reason: string; fallbackLine?: number };

function parseLineAnchor(anchor: string): number | null {
  const m = anchor.match(/^line:(\d+)$/i);
  if (!m) return null;
  const n = Number(m[1]);
  return Number.isFinite(n) && n >= 1 ? Math.floor(n) : null;
}

async function fetchSymbolLineRange(
  filePath: string,
  name: string,
): Promise<SymbolLineRange | null> {
  const params = new URLSearchParams({ path: filePath, name });
  const res = await sidecarFetch(`${SERVER_URL}/search/symbol-line-range?${params}`, {
    headers: sidecarAuthHeaders(),
  }, 5_000);
  if (!res.ok) return null;
  const data = (await res.json()) as SymbolLineRange;
  if (typeof data.line_start !== 'number' || typeof data.line_end !== 'number') return null;
  return data;
}

async function fetchSymbolAtLine(filePath: string, line: number): Promise<SymbolLineRange | null> {
  const params = new URLSearchParams({ path: filePath, line: String(line) });
  const res = await sidecarFetch(`${SERVER_URL}/search/symbol-at-line?${params}`, {
    headers: sidecarAuthHeaders(),
  }, 5_000);
  if (!res.ok) return null;
  const data = (await res.json()) as SymbolLineRange;
  if (typeof data.line_start !== 'number' || typeof data.line_end !== 'number') return null;
  return data;
}

async function findAmbiguousSymbols(
  name: string,
  filePath: string,
): Promise<Array<{ path: string; name: string; line_start: number }>> {
  const pathPrefix = getActiveCodeProjectRootPath() ?? '';
  const params = new URLSearchParams({
    name,
    path_prefix: pathPrefix,
    limit: '10',
  });
  const res = await sidecarFetch(`${SERVER_URL}/search/symbols?${params}`, {
    headers: sidecarAuthHeaders(),
  }, 5_000);
  if (!res.ok) return [];
  const data = (await res.json()) as {
    symbols?: Array<{ path: string; name: string; line_start: number }>;
  };
  const symbols = Array.isArray(data.symbols) ? data.symbols : [];
  const exact = symbols.filter((s) => s.name === name);
  if (filePath) {
    const inFile = exact.filter((s) => s.path === filePath);
    if (inFile.length > 0) return inFile;
  }
  return exact;
}

/**
 * Resolve anchorSymbol to a line range via the SQLite index (desktop-server sidecar).
 */
export async function resolveSymbolAnchor(
  filePath: string,
  anchorSymbol: string,
): Promise<SymbolAnchorResolution> {
  const anchor = anchorSymbol.trim();
  if (!anchor) {
    return { ok: false, reason: 'empty anchor' };
  }

  const lineNum = parseLineAnchor(anchor);
  if (lineNum !== null) {
    const atLine = await fetchSymbolAtLine(filePath, lineNum);
    if (atLine) {
      return { ok: true, range: atLine, resolvedVia: 'symbolAnchor' };
    }
    return { ok: false, reason: `no indexed symbol at line ${lineNum}`, fallbackLine: lineNum };
  }

  const direct = await fetchSymbolLineRange(filePath, anchor);
  if (direct) {
    return { ok: true, range: direct, resolvedVia: 'symbolAnchor' };
  }

  const dotted = anchor.includes('.') ? anchor.split('.').pop()! : anchor;
  if (dotted !== anchor) {
    const nested = await fetchSymbolLineRange(filePath, dotted);
    if (nested) {
      return { ok: true, range: nested, resolvedVia: 'symbolAnchor' };
    }
  }

  const matches = await findAmbiguousSymbols(anchor, filePath);
  if (matches.length === 1 && matches[0].path === filePath) {
    const range = await fetchSymbolLineRange(filePath, matches[0].name);
    if (range) return { ok: true, range, resolvedVia: 'symbolAnchor' };
  }
  if (matches.length > 1) {
    const paths = matches.map((m) => `${m.path}:${m.name} (line ${m.line_start})`).join('; ');
    return { ok: false, reason: `ambiguous symbol "${anchor}" — specify path. Candidates: ${paths}` };
  }

  return { ok: false, reason: `symbol "${anchor}" not found in index` };
}
