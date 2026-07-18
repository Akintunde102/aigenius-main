import type { ParsedSymbol } from './symbol-parser.js';
import { isCodeExtension, parseSymbols } from './symbol-parser.js';

export type FileChunk = {
  chunkIndex: number;
  lineStart: number;
  lineEnd: number;
  symbolName: string | null;
  content: string;
};

const DEFAULT_WINDOW_LINES = 150;
const OVERLAP_LINES = 20;
const MAX_CHUNK_CHARS = 12_000;

function sliceLines(content: string, lineStart: number, lineEnd: number): string {
  const lines = content.split('\n');
  const start = Math.max(1, lineStart) - 1;
  const end = Math.min(lines.length, lineEnd);
  return lines.slice(start, end).join('\n');
}

function windowChunks(content: string): FileChunk[] {
  const lines = content.split('\n');
  const total = lines.length;
  if (total === 0) return [];

  const chunks: FileChunk[] = [];
  let chunkIndex = 0;
  let start = 1;

  while (start <= total) {
    const end = Math.min(start + DEFAULT_WINDOW_LINES - 1, total);
    const slice = lines.slice(start - 1, end).join('\n');
    if (slice.trim()) {
      chunks.push({
        chunkIndex: chunkIndex++,
        lineStart: start,
        lineEnd: end,
        symbolName: null,
        content: slice.length > MAX_CHUNK_CHARS ? slice.slice(0, MAX_CHUNK_CHARS) : slice,
      });
    }
    if (end >= total) break;
    start = end - OVERLAP_LINES + 1;
    if (start <= chunks[chunks.length - 1]?.lineStart) start = end + 1;
  }

  return chunks;
}

function symbolBoundedChunks(content: string, symbols: ParsedSymbol[]): FileChunk[] {
  const chunks: FileChunk[] = [];
  let chunkIndex = 0;

  for (let i = 0; i < symbols.length; i++) {
    const sym = symbols[i]!;
    const nextStart = symbols[i + 1]?.lineStart;
    const lineEnd = nextStart != null ? nextStart - 1 : content.split('\n').length;
    const slice = sliceLines(content, sym.lineStart, lineEnd);
    if (!slice.trim()) continue;
    chunks.push({
      chunkIndex: chunkIndex++,
      lineStart: sym.lineStart,
      lineEnd,
      symbolName: sym.name,
      content: slice.length > MAX_CHUNK_CHARS ? slice.slice(0, MAX_CHUNK_CHARS) : slice,
    });
  }

  return chunks;
}

/**
 * Split file content into symbol-bounded chunks (fallback: overlapping line windows).
 */
export function buildFileChunks(content: string, extension: string): FileChunk[] {
  if (!content.trim()) return [];
  if (!isCodeExtension(extension)) {
    if (content.length <= MAX_CHUNK_CHARS) {
      const lineCount = content.split('\n').length;
      return [{
        chunkIndex: 0,
        lineStart: 1,
        lineEnd: lineCount,
        symbolName: null,
        content,
      }];
    }
    return windowChunks(content);
  }
  const symbols = parseSymbols(content, extension);
  return buildFileChunksFromSymbols(content, extension, symbols);
}

/** Use pre-parsed symbols (AST/tree-sitter) for chunk boundaries. */
export function buildFileChunksFromSymbols(
  content: string,
  extension: string,
  symbols: ParsedSymbol[],
): FileChunk[] {
  if (!content.trim()) return [];
  if (symbols.length > 0 && isCodeExtension(extension)) {
    return symbolBoundedChunks(content, symbols);
  }
  if (!isCodeExtension(extension)) {
    if (content.length <= MAX_CHUNK_CHARS) {
      const lineCount = content.split('\n').length;
      return [{
        chunkIndex: 0,
        lineStart: 1,
        lineEnd: lineCount,
        symbolName: null,
        content,
      }];
    }
    return windowChunks(content);
  }
  return windowChunks(content);
}
