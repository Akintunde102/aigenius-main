/** Confidence tiers exposed to agents and UI. */
export type GraphConfidence = 'static-certain' | 'static-heuristic' | 'inferred';

export type SymbolChangeType = 'signature_change' | 'removal' | 'return_type_change';

export type TypeFlowDirection = 'upstream' | 'downstream' | 'both';

const CONFIDENCE_RANK: Record<GraphConfidence, number> = {
  'static-certain': 3,
  'static-heuristic': 2,
  inferred: 1,
};

/** Map stored DB confidence to API tier. */
export function normalizeConfidence(stored: string): GraphConfidence {
  const s = stored.toLowerCase();
  if (s === 'static-certain' || s === 'high') return 'static-certain';
  if (s === 'static-heuristic' || s === 'heuristic') return 'static-heuristic';
  return 'inferred';
}

export function meetsMinConfidence(stored: string, min: GraphConfidence): boolean {
  return CONFIDENCE_RANK[normalizeConfidence(stored)] >= CONFIDENCE_RANK[min];
}

export function makeQualifiedName(filePath: string, symbolName: string): string {
  return `${filePath.replace(/\\/g, '/')}#${symbolName}`;
}

/** Parse `path#symbol` or `path::Class.method` qualified names. */
export function parseQualifiedName(input: string): { path: string; name: string } | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  const hashIdx = trimmed.lastIndexOf('#');
  if (hashIdx > 0) {
    return {
      path: trimmed.slice(0, hashIdx),
      name: trimmed.slice(hashIdx + 1),
    };
  }

  const dblColon = trimmed.lastIndexOf('::');
  if (dblColon > 0) {
    const pathPart = trimmed.slice(0, dblColon);
    const rest = trimmed.slice(dblColon + 2);
    const dot = rest.lastIndexOf('.');
    const name = dot >= 0 ? rest.slice(dot + 1) : rest;
    return { path: pathPart, name };
  }

  return null;
}

export function signatureHash(signature: string): string {
  let h = 0;
  for (let i = 0; i < signature.length; i++) {
    h = (Math.imul(31, h) + signature.charCodeAt(i)) | 0;
  }
  return (h >>> 0).toString(16).padStart(8, '0');
}

export function isTestFilePath(filePath: string): boolean {
  const norm = filePath.replace(/\\/g, '/').toLowerCase();
  return (
    /\.(spec|test)\.[jt]sx?$/.test(norm) ||
    norm.includes('/__tests__/') ||
    norm.includes('/tests/')
  );
}
