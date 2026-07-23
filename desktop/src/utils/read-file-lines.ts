import fs from 'fs';
import readline from 'readline';

/** Skip line counting above this size (bytes) to avoid long scans on huge files. */
export const MAX_LINE_COUNT_FILE_BYTES = 50_000_000;

export const DEFAULT_MAX_LINES = 400;
export const MAX_MAX_LINES = 10_000;

export type ReadFileLinesResult = {
  lines: string[];
  totalLines: number;
  lineStart: number;
  lineEnd: number;
  truncatedBelow: boolean;
  lineCountOmitted: boolean;
};

export type CountFileLinesResult = {
  totalLines: number;
  lineCountOmitted: boolean;
};

function openLineReader(filePath: string): readline.Interface {
  const stream = fs.createReadStream(filePath, { encoding: 'utf8' });
  return readline.createInterface({ input: stream, crlfDelay: Infinity });
}

/**
 * Count logical lines in a text file (streaming; does not load file body into memory).
 * Empty file → 0 lines.
 */
export async function countFileLines(filePath: string): Promise<CountFileLinesResult> {
  try {
    const stat = await fs.promises.stat(filePath);
    if (!stat.isFile()) {
      return { totalLines: 0, lineCountOmitted: true };
    }
    if (stat.size > MAX_LINE_COUNT_FILE_BYTES) {
      return { totalLines: 0, lineCountOmitted: true };
    }
  } catch {
    return { totalLines: 0, lineCountOmitted: true };
  }

  return new Promise((resolve, reject) => {
    let totalLines = 0;
    const rl = openLineReader(filePath);
    rl.on('line', () => {
      totalLines += 1;
    });
    rl.on('close', () => resolve({ totalLines, lineCountOmitted: false }));
    rl.on('error', reject);
  });
}

/**
 * Read a 1-based inclusive line window. Streams the file once.
 */
export async function readFileLines(
  filePath: string,
  startLine: number,
  maxLines: number,
): Promise<ReadFileLinesResult> {
  const safeStart = Math.max(1, Math.floor(startLine));
  const safeMax = Math.min(Math.max(1, Math.floor(maxLines)), MAX_MAX_LINES);
  const endLineWanted = safeStart + safeMax - 1;

  let lineCountOmitted = false;
  try {
    const stat = await fs.promises.stat(filePath);
    if (stat.size > MAX_LINE_COUNT_FILE_BYTES) {
      lineCountOmitted = true;
    }
  } catch {
    lineCountOmitted = true;
  }

  return new Promise((resolve, reject) => {
    const collected: string[] = [];
    let lineNum = 0;
    let truncatedBelow = false;
    const rl = openLineReader(filePath);

    rl.on('line', (line) => {
      lineNum += 1;
      if (lineNum < safeStart) {
        return;
      }
      if (lineNum <= endLineWanted) {
        collected.push(line);
        return;
      }
      truncatedBelow = true;
    });

    rl.on('close', () => {
      const lineStart = collected.length > 0 ? safeStart : safeStart;
      const lineEnd = collected.length > 0 ? safeStart + collected.length - 1 : 0;
      resolve({
        lines: collected,
        totalLines: lineCountOmitted ? 0 : lineNum,
        lineStart,
        lineEnd,
        truncatedBelow: truncatedBelow || (lineCountOmitted ? false : lineNum > endLineWanted),
        lineCountOmitted,
      });
    });

    rl.on('error', reject);
  });
}

/** Prefix each line with a fixed-width line number (cat -n style). */
export function formatNumberedLines(lines: string[], lineStart: number): string {
  if (lines.length === 0) {
    return '';
  }
  const endLine = lineStart + lines.length - 1;
  const width = Math.max(6, String(endLine).length);
  return lines
    .map((line, i) => `${String(lineStart + i).padStart(width, ' ')}\t${line}`)
    .join('\n');
}

export function wantsLineBasedRead(args: Record<string, unknown>): boolean {
  return typeof args.start_line === 'number' || typeof args.max_lines === 'number';
}
