export type BoundaryHit = {
  line: number;
  boundaryType: string;
  label: string;
  confidence: 'high' | 'heuristic';
};

export type BoundaryPattern = {
  boundaryType: string;
  re: RegExp;
  labelGroup?: number;
  confidence?: 'high' | 'heuristic';
  languages?: string[];
};

/** Patterns that mark cross-language or external entry points. Grows over time. */
export const BOUNDARY_PATTERNS: BoundaryPattern[] = [
  { boundaryType: 'http_route', re: /@(Get|Post|Put|Patch|Delete|Options|Head)\s*\(/, confidence: 'high', languages: ['ts'] },
  { boundaryType: 'http_route', re: /@Controller\s*\(/, confidence: 'high', languages: ['ts'] },
  { boundaryType: 'db_entity', re: /@Entity\s*\(/, confidence: 'high', languages: ['ts'] },
  { boundaryType: 'ipc', re: /ipcMain\.handle\s*\(\s*['"`]([^'"`]+)['"`]/, labelGroup: 1, confidence: 'high', languages: ['ts', 'js'] },
  { boundaryType: 'ipc', re: /ipcRenderer\.invoke\s*\(\s*['"`]([^'"`]+)['"`]/, labelGroup: 1, confidence: 'high', languages: ['ts', 'js'] },
  { boundaryType: 'native_binding', re: /require\s*\(\s*['"`].*\.node['"`]\s*\)/, confidence: 'heuristic', languages: ['ts', 'js'] },
  { boundaryType: 'python_sidecar', re: /spawn\s*\(\s*['"`]python/, confidence: 'heuristic', languages: ['ts', 'js'] },
  { boundaryType: 'websocket', re: /@WebSocketGateway\s*\(/, confidence: 'high', languages: ['ts'] },
  { boundaryType: 'graphql', re: /@(Query|Mutation|Resolver)\s*\(/, confidence: 'high', languages: ['ts'] },
  { boundaryType: 'flask_route', re: /@app\.route\s*\(/, confidence: 'high', languages: ['py'] },
  { boundaryType: 'fastapi_route', re: /@(router|app)\.(get|post|put|delete|patch)\s*\(/, confidence: 'high', languages: ['py'] },
];

export function detectBoundaries(
  content: string,
  extension: string,
): BoundaryHit[] {
  const lang = extension.toLowerCase().replace(/^\./, '');
  const lines = content.split('\n');
  const hits: BoundaryHit[] = [];

  for (const pattern of BOUNDARY_PATTERNS) {
    if (pattern.languages && !pattern.languages.includes(lang)) continue;
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const m = pattern.re.exec(line);
      if (!m) continue;
      const label =
        pattern.labelGroup != null && m[pattern.labelGroup]
          ? m[pattern.labelGroup]!
          : line.trim().slice(0, 120);
      hits.push({
        line: i + 1,
        boundaryType: pattern.boundaryType,
        label,
        confidence: pattern.confidence ?? 'high',
      });
    }
  }

  return hits;
}
