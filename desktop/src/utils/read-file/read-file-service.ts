import fs from 'fs/promises';
import {
  countFileLines,
  formatNumberedLines,
  MAX_MAX_LINES,
  readFileLines,
} from '../read-file-lines';
import { isBinaryFile } from './binary-detect';
import { resolveContextBudget } from './context-budget-policy';
import {
  buildDocSectionIndex,
  formatDocIndex,
  isDocIndexCandidate,
  resolveDocSection,
  shouldAutoDocIndex,
} from './doc-index';
import { truncateLongLine } from './long-line';
import { resolveReadFilePath } from './path-resolver';
import { resolveSymbolAnchor } from './symbol-anchor';
import type {
  ReadFileBatchResult,
  ReadFileItemResult,
  ReadFileRequest,
  ReadFileResolvedVia,
} from './types';

export type ExecuteReadFileOptions = {
  modelContextLength?: number;
};

function parseReadMode(raw: unknown): ReadFileRequest['mode'] {
  if (raw === 'auto' || raw === 'lines' || raw === 'index') return raw;
  return undefined;
}

function normalizeRequests(args: Record<string, unknown>): ReadFileRequest[] {
  if (Array.isArray(args.reads) && args.reads.length > 0) {
    return (args.reads as unknown[])
      .filter((r): r is Record<string, unknown> => Boolean(r) && typeof r === 'object')
      .map((r) => ({
        path: typeof r.path === 'string' ? r.path : '',
        start_line: typeof r.start_line === 'number' ? r.start_line : undefined,
        max_lines: typeof r.max_lines === 'number' ? r.max_lines : undefined,
        offset: typeof r.offset === 'number' ? r.offset : undefined,
        limit: typeof r.limit === 'number' ? r.limit : undefined,
        anchorSymbol: typeof r.anchorSymbol === 'string' ? r.anchorSymbol : undefined,
        mode: parseReadMode(r.mode),
      }))
      .filter((r) => r.path);
  }

  if (typeof args.path === 'string' && args.path) {
    return [{
      path: args.path,
      start_line: typeof args.start_line === 'number' ? args.start_line : undefined,
      max_lines: typeof args.max_lines === 'number' ? args.max_lines : undefined,
      offset: typeof args.offset === 'number' ? args.offset : undefined,
      limit: typeof args.limit === 'number' ? args.limit : undefined,
      anchorSymbol: typeof args.anchorSymbol === 'string' ? args.anchorSymbol : undefined,
      mode: parseReadMode(args.mode),
    }];
  }

  return [];
}

function resolveStartLine(req: ReadFileRequest): number {
  if (typeof req.start_line === 'number' && req.start_line >= 1) {
    return Math.floor(req.start_line);
  }
  if (typeof req.offset === 'number' && req.offset >= 0) {
    return Math.floor(req.offset) + 1;
  }
  return 1;
}

function resolveMaxLines(req: ReadFileRequest, budgetMaxLines: number): number {
  if (typeof req.max_lines === 'number') {
    return Math.min(Math.max(1, Math.floor(req.max_lines)), MAX_MAX_LINES);
  }
  if (typeof req.limit === 'number') {
    return Math.min(Math.max(1, Math.floor(req.limit)), MAX_MAX_LINES);
  }
  return Math.min(budgetMaxLines, MAX_MAX_LINES);
}

function buildTruncationNotice(
  lineStart: number,
  lineEnd: number,
  totalLines: number | undefined,
  path: string,
): string {
  if (totalLines && lineEnd < totalLines) {
    return `Showing lines ${lineStart}–${lineEnd} of ${totalLines}. Call again with start_line=${lineEnd + 1} (or offset=${lineEnd}) to continue reading ${path}.`;
  }
  return `Showing lines ${lineStart}–${lineEnd}. More content may exist below — call again with start_line=${lineEnd + 1} to continue.`;
}

async function readLineWindow(
  resolvedPath: string,
  displayPath: string,
  startLine: number,
  maxLines: number,
  resolvedVia: ReadFileResolvedVia,
  fallbackNote?: string,
): Promise<ReadFileItemResult> {
  const slice = await readFileLines(resolvedPath, startLine, maxLines);
  const processedLines = slice.lines.map((l) => truncateLongLine(l).text);
  const content = formatNumberedLines(processedLines, slice.lineStart);
  const totalLines = slice.lineCountOmitted ? undefined : slice.totalLines;
  const hasContent = slice.lines.length > 0;
  const truncated = hasContent && (
    slice.truncatedBelow || (totalLines !== undefined && slice.lineEnd < totalLines)
  );
  const truncationNotice = truncated
    ? buildTruncationNotice(slice.lineStart, slice.lineEnd, totalLines, displayPath)
    : undefined;

  let body = content;
  if (fallbackNote) {
    body = `> Note: ${fallbackNote}\n\n${content}`;
  }
  if (truncationNotice) {
    body = `> ⚠ ${truncationNotice}\n\n${body}`;
  }

  return {
    path: displayPath,
    resolvedPath,
    status: truncated ? 'truncated' : 'ok',
    linesReturned: slice.lineEnd > 0 ? [slice.lineStart, slice.lineEnd] : undefined,
    totalLines,
    content: body,
    truncationNotice,
    resolvedVia,
    mode: 'lines',
    line_count_omitted: slice.lineCountOmitted,
  };
}

async function readSingle(
  req: ReadFileRequest,
  budgetMaxLines: number,
  charBudgetRemaining: { value: number },
): Promise<ReadFileItemResult> {
  const pathResult = await resolveReadFilePath(req.path);
  if (!pathResult.ok) {
    return { path: req.path, status: 'error', content: pathResult.error, error: pathResult.error };
  }

  const { resolved, displayPath } = pathResult;

  if (await isBinaryFile(resolved)) {
    const err = `Error: unsupported file type — ${displayPath} (binary)`;
    return { path: displayPath, status: 'error', content: err, error: err };
  }

  const mode = req.mode ?? 'auto';

  if (req.anchorSymbol?.match(/^section:\d+$/i) || (mode === 'index' && isDocIndexCandidate(resolved))) {
    const sections = await buildDocSectionIndex(resolved);
    if (req.anchorSymbol) {
      const section = resolveDocSection(sections, req.anchorSymbol);
      if (!section) {
        const err = `Error: section not found — ${req.anchorSymbol}`;
        return { path: displayPath, status: 'error', content: err, error: err };
      }
      const result = await readLineWindow(
        resolved,
        displayPath,
        section.line_start,
        section.line_end - section.line_start + 1,
        'docIndex',
      );
      result.resolvedVia = 'docIndex';
      return result;
    }
    const indexBody = formatDocIndex(sections);
    return {
      path: displayPath,
      resolvedPath: resolved,
      status: 'ok',
      content: `Document section index for ${displayPath}:\n\n${indexBody}`,
      resolvedVia: 'docIndex',
      mode: 'index',
    };
  }

  if (req.anchorSymbol && !req.anchorSymbol.match(/^section:/i)) {
    const anchor = await resolveSymbolAnchor(resolved, req.anchorSymbol);
    if (anchor.ok) {
      const span = anchor.range.line_end - anchor.range.line_start + 1;
      const result = await readLineWindow(
        resolved,
        displayPath,
        anchor.range.line_start,
        Math.min(span, budgetMaxLines),
        'symbolAnchor',
      );
      return result;
    }
    const fallbackLine = anchor.fallbackLine ?? 1;
    const fallbackNote = `anchorSymbol "${req.anchorSymbol}" did not resolve (${anchor.reason}); showing line-range fallback.`;
    return readLineWindow(
      resolved,
      displayPath,
      fallbackLine,
      Math.min(80, budgetMaxLines),
      'lineRangeFallback',
      fallbackNote,
    );
  }

  const lineCount = await countFileLines(resolved);
  const totalLines = lineCount.lineCountOmitted ? undefined : lineCount.totalLines;

  if (
    isDocIndexCandidate(resolved)
    && shouldAutoDocIndex(totalLines ?? 0, mode)
    && !req.start_line
    && !req.max_lines
    && req.offset === undefined
    && req.limit === undefined
  ) {
    const sections = await buildDocSectionIndex(resolved);
    const indexBody = formatDocIndex(sections);
    return {
      path: displayPath,
      resolvedPath: resolved,
      status: 'ok',
      totalLines,
      content: `> Large document (${totalLines ?? 'unknown'} lines). Section index:\n\n${indexBody}\n\nRequest a section with anchorSymbol: "section:N" or use start_line/max_lines.`,
      resolvedVia: 'docIndex',
      mode: 'index',
      line_count_omitted: lineCount.lineCountOmitted,
    };
  }

  const wantsLineMode =
    mode === 'lines'
    || typeof req.start_line === 'number'
    || typeof req.max_lines === 'number'
    || typeof req.offset === 'number'
    || typeof req.limit === 'number'
    || mode === 'auto';

  if (wantsLineMode) {
    const startLine = resolveStartLine(req);
    const maxLines = resolveMaxLines(req, budgetMaxLines);
    const result = await readLineWindow(resolved, displayPath, startLine, maxLines, 'lineRange');
    charBudgetRemaining.value -= result.content.length;
    return result;
  }

  return readLineWindow(resolved, displayPath, 1, budgetMaxLines, 'lineRange');
}

async function readBoundedFileByBytes(
  resolvedPath: string,
  displayPath: string,
  offset: number,
  maxBytes: number,
): Promise<ReadFileItemResult> {
  const lineCount = await countFileLines(resolvedPath);
  const fh = await fs.open(resolvedPath, 'r');
  try {
    const buf = Buffer.alloc(maxBytes);
    const { bytesRead } = await fh.read(buf, 0, maxBytes, offset);
    const text = buf.subarray(0, bytesRead).toString('utf8');
    const truncated = bytesRead === maxBytes;
    let content = text;
    if (truncated) {
      content = `> ⚠ Truncated at byte limit (${maxBytes}). Use start_line/max_lines for precise windows.\n\n${text}`;
    }
    return {
      path: displayPath,
      resolvedPath: resolvedPath,
      status: truncated ? 'truncated' : 'ok',
      content,
      bytes_read: bytesRead,
      resolvedVia: 'bytes',
      mode: 'bytes',
      totalLines: lineCount.lineCountOmitted ? undefined : lineCount.totalLines,
      line_count_omitted: lineCount.lineCountOmitted,
      truncationNotice: truncated
        ? `Byte read truncated at ${maxBytes} bytes. Use start_line/max_lines instead.`
        : undefined,
    };
  } finally {
    await fh.close();
  }
}

export async function executeReadFile(
  args: Record<string, unknown>,
  options: ExecuteReadFileOptions = {},
): Promise<ReadFileBatchResult> {
  const modelContextLength =
    typeof args.model_context_length === 'number'
      ? args.model_context_length
      : options.modelContextLength;

  const budget = resolveContextBudget(modelContextLength);
  const requests = normalizeRequests(args);

  if (requests.length === 0) {
    return {
      results: [{
        path: '',
        status: 'error',
        content: 'Error: path is required (or provide reads[])',
        error: 'Error: path is required (or provide reads[])',
      }],
    };
  }

  const capped = requests.slice(0, budget.maxFiles);
  const charBudget = { value: budget.maxChars };
  const results: ReadFileItemResult[] = [];

  const useByteMode =
    !Array.isArray(args.reads)
    && typeof args.path === 'string'
    && typeof args.max_bytes === 'number'
    && typeof args.start_line !== 'number'
    && typeof args.max_lines !== 'number';

  if (useByteMode && requests.length === 1) {
    const pathResult = await resolveReadFilePath(requests[0].path);
    if (!pathResult.ok) {
      return {
        results: [{
          path: requests[0].path,
          status: 'error',
          content: pathResult.error,
          error: pathResult.error,
        }],
      };
    }
    const offset = typeof args.offset === 'number' && args.offset >= 0 ? args.offset : 0;
    const maxBytes = typeof args.max_bytes === 'number'
      ? Math.min(Math.max(1, Math.floor(args.max_bytes)), 2_000_000)
      : 65_536;
    const item = await readBoundedFileByBytes(pathResult.resolved, pathResult.displayPath, offset, maxBytes);
    return { results: [item] };
  }

  for (let i = 0; i < capped.length; i += 1) {
    if (charBudget.value <= 0) {
      results.push({
        path: capped[i].path,
        status: 'truncated',
        content: `> ⚠ Batch character budget exhausted. Request this file individually with local_read_file.`,
        truncationNotice: 'Batch budget exhausted — retry this file alone.',
      });
      continue;
    }

    const item = await readSingle(capped[i], budget.maxLines, charBudget);
    if (item.content.length > charBudget.value) {
      const allowed = item.content.slice(0, charBudget.value);
      results.push({
        ...item,
        status: 'truncated',
        content: `> ⚠ Response truncated to fit context budget.\n\n${allowed}`,
        truncationNotice: 'Character budget reached for this batch.',
      });
      charBudget.value = 0;
    } else {
      charBudget.value -= item.content.length;
      results.push(item);
    }
  }

  if (requests.length > budget.maxFiles) {
    for (let j = budget.maxFiles; j < requests.length; j += 1) {
      results.push({
        path: requests[j].path,
        status: 'truncated',
        content: `> ⚠ Skipped — batch limit is ${budget.maxFiles} files. Request separately.`,
        truncationNotice: `Exceeded max ${budget.maxFiles} files per call.`,
      });
    }
  }

  return { results };
}
