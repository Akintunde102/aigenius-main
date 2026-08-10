import {
  countFileLines,
  MAX_LINE_COUNT_FILE_BYTES,
  MAX_MAX_LINES,
  readFileLines,
  type CountFileLinesResult,
  type ReadFileLinesResult,
} from '../read-file-lines';

export type FileLineSource = {
  type: 'file';
  path: string;
};

export type MemoryLineSource = {
  type: 'memory';
  path: string;
  lines: string[];
};

export type LineSource = FileLineSource | MemoryLineSource;

export async function countLinesFromSource(source: LineSource): Promise<CountFileLinesResult> {
  if (source.type === 'file') {
    return countFileLines(source.path);
  }

  const totalLines = source.lines.length;
  if (totalLines === 0) {
    return { totalLines: 0, lineCountOmitted: false };
  }

  const approxBytes = source.lines.reduce((sum, line) => sum + line.length + 1, 0);
  if (approxBytes > MAX_LINE_COUNT_FILE_BYTES) {
    return { totalLines: 0, lineCountOmitted: true };
  }

  return { totalLines, lineCountOmitted: false };
}

export async function readLinesFromSource(
  source: LineSource,
  startLine: number,
  maxLines: number,
): Promise<ReadFileLinesResult> {
  if (source.type === 'file') {
    return readFileLines(source.path, startLine, maxLines);
  }

  const safeStart = Math.max(1, Math.floor(startLine));
  const safeMax = Math.min(Math.max(1, Math.floor(maxLines)), MAX_MAX_LINES);
  const endLineWanted = safeStart + safeMax - 1;
  const totalLines = source.lines.length;

  const lineStart = safeStart;
  const sliceStart = safeStart - 1;
  const sliceEnd = Math.min(endLineWanted, totalLines);
  const collected = source.lines.slice(sliceStart, sliceEnd);
  const lineEnd = sliceStart + collected.length;

  const truncatedBelow = endLineWanted < totalLines;
  const approxBytes = source.lines.reduce((sum, line) => sum + line.length + 1, 0);
  const lineCountOmitted = approxBytes > MAX_LINE_COUNT_FILE_BYTES;

  return {
    lines: collected,
    totalLines: lineCountOmitted ? 0 : totalLines,
    lineStart,
    lineEnd,
    truncatedBelow,
    lineCountOmitted,
  };
}
