import { loopbackHttpOrigin } from './loopback-host';

const MINI_SERVER_PORT = Number(process.env.AIGENIUS_MINI_SERVER_PORT ?? 8001);
const SERVER_URL = loopbackHttpOrigin(MINI_SERVER_PORT);

function sidecarAuthHeaders(): Record<string, string> {
  const token = process.env.AIGENIUS_SECRET_TOKEN;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

const SYMBOL_PATTERNS: Array<{ kind: string; re: RegExp }> = [
  { kind: 'class', re: /^\s*export\s+(?:default\s+)?class\s+([A-Za-z_$][\w$]*)/gm },
  { kind: 'function', re: /^\s*export\s+(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm },
  { kind: 'const', re: /^\s*export\s+const\s+([A-Za-z_$][\w$]*)/gm },
  { kind: 'interface', re: /^\s*export\s+interface\s+([A-Za-z_$][\w$]*)/gm },
  { kind: 'type', re: /^\s*export\s+type\s+([A-Za-z_$][\w$]*)/gm },
  { kind: 'class', re: /^\s*class\s+([A-Za-z_$][\w$]*)/gm },
  { kind: 'function', re: /^\s*(?:async\s+)?function\s+([A-Za-z_$][\w$]*)/gm },
];

function lineNumberAt(content: string, index: number): number {
  return content.slice(0, index).split('\n').length;
}

function extractSymbolOutlineRegex(filePath: string, content: string): string {
  const lines: string[] = [`# ${filePath}`, ''];
  const seen = new Set<string>();

  for (const { kind, re } of SYMBOL_PATTERNS) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(content)) !== null) {
      const name = m[1];
      const key = `${kind}:${name}:${m.index}`;
      if (seen.has(key)) continue;
      seen.add(key);
      const line = lineNumberAt(content, m.index);
      lines.push(`- ${kind} **${name}** @ line ${line}`);
    }
  }

  if (lines.length <= 2) {
    lines.push('_No top-level symbols matched (try reading the file directly)._');
  }

  return lines.join('\n');
}

async function fetchIndexedSymbolOutline(filePath: string): Promise<string | null> {
  try {
    const url = `${SERVER_URL}/search/symbols?path=${encodeURIComponent(filePath)}`;
    const res = await fetch(url, { headers: sidecarAuthHeaders() });
    if (!res.ok) return null;
    const data = (await res.json()) as { outline?: string; symbols?: unknown[] };
    if (typeof data.outline === 'string' && data.outline.trim()) {
      return data.outline;
    }
    return null;
  } catch {
    return null;
  }
}

/**
 * Symbol outline: prefers sidecar symbol_index (Phase 5), falls back to regex.
 */
export async function extractSymbolOutline(filePath: string, content: string): Promise<string> {
  const indexed = await fetchIndexedSymbolOutline(filePath);
  if (indexed) return indexed;
  return extractSymbolOutlineRegex(filePath, content);
}
