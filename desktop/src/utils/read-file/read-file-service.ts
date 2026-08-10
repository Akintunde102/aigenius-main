import fs from 'fs';
import readline from 'readline';
import fsPromises from 'fs/promises';
import {
  countFileLines,
  formatNumberedLines,
  MAX_MAX_LINES,
} from '../read-file-lines';
import { batchReadDenyReason } from './batch-read-denylist';
import { isBinaryFile } from './binary-detect';
import { isImageExtension } from '../image-extensions';
import path from 'path';
import {
  resolveBatchReadBudget,
  resolveSingleFileLineBudget,
} from './context-budget-policy';
import {
  buildDocSectionIndex,
  formatDocIndex,
  isDocIndexCandidate,
  resolveDocSection,
  shouldAutoDocIndex,
} from './doc-index';
import { truncateLongLine } from './long-line';
import {
  countLinesFromSource,
  readLinesFromSource,
  type LineSource,
} from './line-source';
import { resolveReadFilePath } from './path-resolver';
import { resolveSymbolAnchor } from './symbol-anchor';
import {
  documentExtractKind,
  getDocumentTextLines,
  type DocumentExtractKind,
} from './document-text-extract';
import type {
  ReadFileBatchMeta,
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

function hasExplicitReadWindow(req: ReadFileRequest): boolean {
  return (
    typeof req.start_line === 'number'
    || typeof req.max_lines === 'number'
    || typeof req.offset === 'number'
    || typeof req.limit === 'number'
    || Boolean(req.anchorSymbol)
    || req.mode === 'lines'
    || req.mode === 'index'
  );
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
  filePath: string,
): string {
  if (totalLines && lineEnd < totalLines) {
    return `Showing lines ${lineStart}–${lineEnd} of ${totalLines}. Call again with start_line=${lineEnd + 1} (or offset=${lineEnd}) to continue reading ${filePath}.`;
  }
  return `Showing lines ${lineStart}–${lineEnd}. More content may exist below — call again with start_line=${lineEnd + 1} to continue.`;
}

function buildBatchBudgetTruncationNotice(
  lineStart: number,
  lineEnd: number,
  totalLines: number | undefined,
  filePath: string,
): string {
  if (totalLines && lineEnd < totalLines) {
    return `Batch budget exhausted inside this file (lines ${lineStart}–${lineEnd} of ${totalLines}). Continue with start_line=${lineEnd + 1}. Do not summarize this file as complete.`;
  }
  return `Batch budget exhausted at lines ${lineStart}–${lineEnd} of ${filePath}. Do not summarize this file as complete.`;
}

type LineSourceResolution =
  | { ok: true; source: LineSource; extractKind?: DocumentExtractKind }
  | { ok: false; error: string };

async function resolveLineSource(
  resolvedPath: string,
  displayPath: string,
): Promise<LineSourceResolution> {
  const kind = documentExtractKind(resolvedPath);
  if (kind) {
    const extracted = await getDocumentTextLines(resolvedPath, kind);
    if (!extracted.ok) {
      return { ok: false, error: extracted.error };
    }
    return {
      ok: true,
      source: { type: 'memory', path: resolvedPath, lines: extracted.lines },
      extractKind: kind,
    };
  }

  if (await isBinaryFile(resolvedPath)) {
    return {
      ok: false,
      error: `Error: unsupported file type — ${displayPath} (binary)`,
    };
  }

  return { ok: true, source: { type: 'file', path: resolvedPath } };
}

function documentExtractNote(kind: DocumentExtractKind): string {
  switch (kind) {
    case 'doc':
      return 'Text extracted from legacy Word document (.doc).';
    case 'docx':
      return 'Text extracted from Word document (.docx).';
    case 'pdf':
      return 'Text extracted from PDF document (.pdf).';
    default:
      return 'Text extracted from document.';
  }
}

function skippedItem(
  path: string,
  reason: 'budget_exhausted' | 'denylist' | 'max_paths',
  message: string,
): ReadFileItemResult {
  return {
    path,
    status: 'skipped',
    skipReason: reason,
    content: message,
    truncationNotice: message,
  };
}

async function readLineWindow(
  source: LineSource,
  displayPath: string,
  startLine: number,
  maxLines: number,
  resolvedVia: ReadFileResolvedVia,
  fallbackNote?: string,
  extractKind?: DocumentExtractKind,
): Promise<ReadFileItemResult> {
  const slice = await readLinesFromSource(source, startLine, maxLines);
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
  if (extractKind) {
    body = `> Note: ${documentExtractNote(extractKind)}\n\n${body}`;
  }
  if (fallbackNote) {
    body = `> Note: ${fallbackNote}\n\n${body}`;
  }
  if (truncationNotice) {
    body = `> ⚠ ${truncationNotice}\n\n${body}`;
  }

  return {
    path: displayPath,
    resolvedPath: source.path,
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

async function readFullFileWithinCharBudget(
  source: LineSource,
  displayPath: string,
  charBudget: { value: number },
  extractKind?: DocumentExtractKind,
): Promise<ReadFileItemResult> {
  const lineCount = await countLinesFromSource(source);
  const totalLines = lineCount.lineCountOmitted ? undefined : lineCount.totalLines;
  const rawLines: string[] = [];
  let stoppedEarly = false;

  if (source.type === 'memory') {
    for (const line of source.lines) {
      const candidate = [...rawLines, line];
      const processed = candidate.map((l) => truncateLongLine(l).text);
      const formatted = formatNumberedLines(processed, 1);
      if (formatted.length > charBudget.value) {
        stoppedEarly = true;
        break;
      }
      rawLines.push(line);
    }
  } else {
    await new Promise<void>((resolve, reject) => {
      const rl = readline.createInterface({
        input: fs.createReadStream(source.path, { encoding: 'utf8' }),
        crlfDelay: Infinity,
      });

      rl.on('line', (line) => {
        const candidate = [...rawLines, line];
        const processed = candidate.map((l) => truncateLongLine(l).text);
        const formatted = formatNumberedLines(processed, 1);
        if (formatted.length > charBudget.value) {
          stoppedEarly = true;
          rl.close();
          resolve();
          return;
        }
        rawLines.push(line);
      });

      rl.on('close', () => resolve());
      rl.on('error', reject);
    });
  }

  const processedLines = rawLines.map((l) => truncateLongLine(l).text);
  const content = formatNumberedLines(processedLines, 1);
  const lineEnd = processedLines.length;
  const truncated = stoppedEarly || (totalLines !== undefined && lineEnd < totalLines);

  charBudget.value = Math.max(0, charBudget.value - content.length);

  const truncationNotice = truncated
    ? buildBatchBudgetTruncationNotice(1, lineEnd, totalLines, displayPath)
    : undefined;

  let body = content;
  if (extractKind) {
    body = `> Note: ${documentExtractNote(extractKind)}\n\n${body}`;
  }
  if (truncationNotice) {
    body = `> ⚠ PARTIAL — ${truncationNotice}\n\n${body}`;
  }

  return {
    path: displayPath,
    resolvedPath: source.path,
    status: truncated ? 'truncated' : 'ok',
    linesReturned: lineEnd > 0 ? [1, lineEnd] : undefined,
    totalLines,
    content: body,
    truncationNotice,
    resolvedVia: 'batchFull',
    mode: 'lines',
    line_count_omitted: lineCount.lineCountOmitted,
  };
}

async function readSingle(
  req: ReadFileRequest,
  budgetMaxLines: number,
  charBudgetRemaining?: { value: number },
): Promise<ReadFileItemResult> {
  const pathResult = await resolveReadFilePath(req.path);
  if (!pathResult.ok) {
    return { path: req.path, status: 'error', content: pathResult.error, error: pathResult.error };
  }

  const { resolved, displayPath } = pathResult;

  const ext = path.extname(resolved).slice(1).toLowerCase();
  if (isImageExtension(ext)) {
    const err =
      `Error: ${displayPath} is an image — use \`local_read_image\` (or \`read_image\`) for OCR and object detection, not \`local_read_file\`.`;
    return { path: displayPath, status: 'error', content: err, error: err };
  }

  const lineSourceResult = await resolveLineSource(resolved, displayPath);
  if (!lineSourceResult.ok) {
    return {
      path: displayPath,
      status: 'error',
      content: lineSourceResult.error,
      error: lineSourceResult.error,
    };
  }

  const { source, extractKind } = lineSourceResult;
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
        source,
        displayPath,
        section.line_start,
        section.line_end - section.line_start + 1,
        'docIndex',
        undefined,
        extractKind,
      );
      result.resolvedVia = 'docIndex';
      if (charBudgetRemaining) {
        charBudgetRemaining.value = Math.max(0, charBudgetRemaining.value - result.content.length);
      }
      return result;
    }
    const indexBody = formatDocIndex(sections);
    const content = `Document section index for ${displayPath}:\n\n${indexBody}`;
    if (charBudgetRemaining) {
      charBudgetRemaining.value = Math.max(0, charBudgetRemaining.value - content.length);
    }
    return {
      path: displayPath,
      resolvedPath: resolved,
      status: 'ok',
      content,
      resolvedVia: 'docIndex',
      mode: 'index',
    };
  }

  if (req.anchorSymbol && !req.anchorSymbol.match(/^section:/i)) {
    const anchor = await resolveSymbolAnchor(resolved, req.anchorSymbol);
    if (anchor.ok) {
      const span = anchor.range.line_end - anchor.range.line_start + 1;
      const result = await readLineWindow(
        source,
        displayPath,
        anchor.range.line_start,
        Math.min(span, budgetMaxLines),
        'symbolAnchor',
        undefined,
        extractKind,
      );
      if (charBudgetRemaining) {
        charBudgetRemaining.value = Math.max(0, charBudgetRemaining.value - result.content.length);
      }
      return result;
    }
    const fallbackLine = anchor.fallbackLine ?? 1;
    const fallbackNote = `anchorSymbol "${req.anchorSymbol}" did not resolve (${anchor.reason}); showing line-range fallback.`;
    const result = await readLineWindow(
      source,
      displayPath,
      fallbackLine,
      Math.min(80, budgetMaxLines),
      'lineRangeFallback',
      fallbackNote,
      extractKind,
    );
    if (charBudgetRemaining) {
      charBudgetRemaining.value = Math.max(0, charBudgetRemaining.value - result.content.length);
    }
    return result;
  }

  const lineCount = await countLinesFromSource(source);
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
    const content = `> Large document (${totalLines ?? 'unknown'} lines). Section index:\n\n${indexBody}\n\nRequest a section with anchorSymbol: "section:N" or use start_line/max_lines.`;
    if (charBudgetRemaining) {
      charBudgetRemaining.value = Math.max(0, charBudgetRemaining.value - content.length);
    }
    return {
      path: displayPath,
      resolvedPath: resolved,
      status: 'ok',
      totalLines,
      content,
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
    const result = await readLineWindow(source, displayPath, startLine, maxLines, 'lineRange', undefined, extractKind);
    if (charBudgetRemaining) {
      if (result.content.length > charBudgetRemaining.value) {
        const allowed = result.content.slice(0, charBudgetRemaining.value);
        charBudgetRemaining.value = 0;
        return {
          ...result,
          status: 'truncated',
          content: `> ⚠ PARTIAL — batch budget exhausted.\n\n${allowed}`,
          truncationNotice: 'Batch budget exhausted while reading this file.',
        };
      }
      charBudgetRemaining.value -= result.content.length;
    }
    return result;
  }

  const result = await readLineWindow(source, displayPath, 1, budgetMaxLines, 'lineRange', undefined, extractKind);
  if (charBudgetRemaining) {
    charBudgetRemaining.value = Math.max(0, charBudgetRemaining.value - result.content.length);
  }
  return result;
}

async function readBoundedFileByBytes(
  resolvedPath: string,
  displayPath: string,
  offset: number,
  maxBytes: number,
): Promise<ReadFileItemResult> {
  const lineCount = await countFileLines(resolvedPath);
  const fh = await fsPromises.open(resolvedPath, 'r');
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

async function executeBatchRead(
  requests: ReadFileRequest[],
  modelContextLength?: number,
): Promise<ReadFileBatchResult> {
  const budget = resolveBatchReadBudget(modelContextLength);
  const charBudget = { value: budget.budgetChars };
  const results: ReadFileItemResult[] = [];
  let budgetExhausted = false;

  const cappedRequests = requests.slice(0, budget.maxPaths);

  for (const req of cappedRequests) {
    const denyReason = batchReadDenyReason(req.path);
    if (denyReason) {
      results.push(
        skippedItem(req.path, 'denylist', `> ⊘ SKIPPED — ${denyReason}`),
      );
      continue;
    }

    if (budgetExhausted || charBudget.value <= 0) {
      budgetExhausted = true;
      results.push(
        skippedItem(
          req.path,
          'budget_exhausted',
          '> ⊘ SKIPPED — batch budget exhausted (40% of model context used). Put important files earlier in reads[].',
        ),
      );
      continue;
    }

    const pathResult = await resolveReadFilePath(req.path);
    if (!pathResult.ok) {
      results.push({
        path: req.path,
        status: 'error',
        content: pathResult.error,
        error: pathResult.error,
      });
      continue;
    }

    const lineSourceResult = await resolveLineSource(pathResult.resolved, pathResult.displayPath);
    if (!lineSourceResult.ok) {
      results.push({
        path: pathResult.displayPath,
        status: 'error',
        content: lineSourceResult.error,
        error: lineSourceResult.error,
      });
      continue;
    }

    let item: ReadFileItemResult;
    if (hasExplicitReadWindow(req)) {
      item = await readSingle(req, MAX_MAX_LINES, charBudget);
    } else {
      item = await readFullFileWithinCharBudget(
        lineSourceResult.source,
        pathResult.displayPath,
        charBudget,
        lineSourceResult.extractKind,
      );
    }

    if (item.status === 'truncated' || charBudget.value <= 0) {
      budgetExhausted = true;
    }
    results.push(item);
  }

  if (requests.length > budget.maxPaths) {
    for (let j = budget.maxPaths; j < requests.length; j += 1) {
      results.push(
        skippedItem(
          requests[j].path,
          'max_paths',
          `> ⊘ SKIPPED — exceeds max ${budget.maxPaths} paths per batch read.`,
        ),
      );
    }
  }

  const charsUsed = budget.budgetChars - charBudget.value;
  const batchMeta: ReadFileBatchMeta = {
    modelContextTokens: budget.modelContextTokens,
    budgetTokens: budget.budgetTokens,
    budgetChars: budget.budgetChars,
    charsUsed,
    budgetFraction: budget.budgetFraction,
    isBatch: true,
  };

  return { results, batchMeta };
}

export async function executeReadFile(
  args: Record<string, unknown>,
  options: ExecuteReadFileOptions = {},
): Promise<ReadFileBatchResult> {
  const modelContextLength =
    typeof args.model_context_length === 'number'
      ? args.model_context_length
      : options.modelContextLength;

  const requests = normalizeRequests(args);
  const isBatch = Array.isArray(args.reads) && args.reads.length > 0;

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

  if (isBatch) {
    return executeBatchRead(requests, modelContextLength);
  }

  const lineBudget = resolveSingleFileLineBudget(modelContextLength);

  const useByteMode =
    typeof args.path === 'string'
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

  const item = await readSingle(requests[0], lineBudget.maxLines);
  return { results: [item] };
}
