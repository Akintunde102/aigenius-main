export type IndexedSymbol = {
  kind: string;
  name: string;
  lineStart: number;
  lineEnd: number;
  signature: string;
  signatureHash?: string;
  confidence: 'high' | 'heuristic';
};

export type IndexedEdge = {
  fromName: string;
  fromLine: number;
  toName: string;
  toPath?: string;
  kind: string;
  line?: number;
  confidence: 'high' | 'heuristic';
};

export type FileIntelligence = {
  language: string;
  symbols: IndexedSymbol[];
  edges: IndexedEdge[];
  isGenerated: boolean;
};

export function languageForExtension(ext: string): string {
  const e = ext.toLowerCase().replace(/^\./, '');
  if (['ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs'].includes(e)) return 'typescript';
  if (e === 'py') return 'python';
  if (e === 'rs') return 'rust';
  if (['cpp', 'cc', 'cxx', 'c', 'h', 'hpp'].includes(e)) return 'cpp';
  if (e === 'make' || e === 'mk' || e === '') return 'makefile';
  return e || 'unknown';
}

export function isGeneratedPath(filePath: string): boolean {
  const norm = filePath.replace(/\\/g, '/').toLowerCase();
  return (
    norm.includes('/dist/') ||
    norm.includes('/node_modules/') ||
    norm.includes('/.next/') ||
    norm.includes('/build/') ||
    norm.includes('/__generated__/') ||
    /\.d\.ts$/.test(norm)
  );
}
