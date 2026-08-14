/**
 * Utilities to format raw tool results into human-readable Markdown.
 */

import { toLocalFileMarkdownImage, toLocalFileMarkdownLink } from './local-file-link';

export interface FormattedToolResult {
  result: string;
  rawData?: any;
}

export interface RagHit {
  path: string;
  name: string;
  score: number;
  snippet: string;
  [key: string]: any;
}

export interface RagQueryResult {
  hits: RagHit[];
  hit_count: number;
  scanned_chunks?: number;
  index_updated_at_ms?: number;
  hint?: string;
  [key: string]: any;
}

/**
 * Formats Local RAG Query results into a clean Markdown summary.
 */
export function formatRagResults(data: any): FormattedToolResult {
  if (!data || typeof data !== 'object') return { result: String(data), rawData: data };

  const result = data as RagQueryResult;
  const hits = Array.isArray(result.hits) ? result.hits : [];
  const count = result.hit_count ?? hits.length;

  if (hits.length === 0) {
    const indexed = typeof result.scanned_chunks === 'number' ? result.scanned_chunks : undefined;
    let md =
      '### Local search\n\n' +
      '- **Matches**: 0\n';
    if (indexed !== undefined) {
      md += `- **Indexed files**: ${indexed}\n`;
    }
    md += '\n';
    if (typeof result.hint === 'string' && result.hint.trim()) {
      md += `*${result.hint.trim()}*`;
    } else if (indexed === 0) {
      md += '*No indexed files for this scope — use `local_grep` and `local_list_directory` on disk.*';
    } else {
      md += '*No matches in the index for this query — use `local_grep` to search the filesystem directly.*';
    }
    return { result: md, rawData: data };
  }

  let md = `### Local search\n\n`;
  md += `- **Matches**: ${count}\n\n`;

  hits.forEach((hit, i) => {
    md += `${i + 1}. **${hit.name || pathBase(hit.path) || 'Unknown File'}**\n`;
    if (hit.path) {
      md += `   - **Path**: ${toLocalFileMarkdownLink(hit.path)}\n`;
    }
    if (typeof hit.score === 'number') {
      md += `   - **Relevance**: ${(hit.score * 100).toFixed(1)}%\n`;
    }
    if (typeof hit.mtime === 'number' && hit.mtime > 0) {
      md += `   - **Last modified**: ${formatModifiedTimestamp(hit.mtime)}\n`;
    }
    if (typeof hit.line_start === 'number') {
      const range =
        typeof hit.line_end === 'number' && hit.line_end !== hit.line_start
          ? `lines ${hit.line_start}–${hit.line_end}`
          : `line ${hit.line_start}`;
      md += `   - **Location**: ${range}\n`;
    }
    if (typeof hit.symbol_name === 'string' && hit.symbol_name) {
      md += `   - **Symbol**: \`${hit.symbol_name}\`\n`;
    }

    // Add any unknown fields for compatibility
    const knownKeys = ['path', 'name', 'score', 'snippet', 'mtime', 'line_start', 'line_end', 'symbol_name', 'chunk_id'];
    const extraKeys = Object.keys(hit).filter(k => !knownKeys.includes(k));
    if (extraKeys.length > 0) {
      const extraInfo = extraKeys.map(k => {
        const val = hit[k];
        return `${k}: ${typeof val === 'string' ? val : JSON.stringify(val)}`;
      }).join(', ');
      md += `   - **Metadata**: ${extraInfo}\n`;
    }

    if (hit.snippet) {
      // Format snippet as a blockquote, cleaning up any escaped newlines
      const cleanSnippet = hit.snippet.replace(/\\n/g, '\n').trim();
      md += `\n   > ${cleanSnippet.split('\n').join('\n   > ')}\n\n`;
    } else {
      md += '\n';
    }
  });

  if (result.index_updated_at_ms) {
    const date = new Date(result.index_updated_at_ms).toLocaleString();
    md += `\n---\n\n`;
    md += `- **Index last updated**: ${date}`;
    if (result.scanned_chunks) {
      md += `\n- **Chunks indexed**: ${result.scanned_chunks.toLocaleString()}`;
    }
    md += `\n`;
  }

  return { result: md, rawData: data };
}

export interface DirectoryListingItem {
  path: string;
  name: string;
  isDir: boolean;
  size?: number;
  mtime?: number;
}

/**
 * Formats directory listing results (same structural pattern as other local tools).
 */
export function formatDirectoryListing(payload: {
  path: string;
  items: DirectoryListingItem[];
  hitLimit?: boolean;
  shellCommand?: string;
  terminalOutput?: string;
}): FormattedToolResult {
  const { path: rootPath, items, hitLimit, shellCommand, terminalOutput } = payload;
  let md = '### Directory listing\n\n';
  md += `- **Directory**: ${toLocalFileMarkdownLink(rootPath)}\n`;
  md += `- **Entries**: ${items.length}${hitLimit ? ' (limit reached)' : ''}\n`;
  if (shellCommand?.trim()) {
    md += `- **Shell**: \`${shellCommand.trim()}\`\n`;
  }
  md += '\n';

  if (terminalOutput?.trim()) {
    md += '```\n';
    md += terminalOutput.trimEnd();
    md += '\n```\n';
    return { result: md.trimEnd() + '\n', rawData: payload };
  }

  if (items.length === 0) {
    md += '*No entries matched (or directory is empty).*';
    return { result: md, rawData: payload };
  }

  items.forEach((r, i) => {
    md += `${i + 1}. **${r.name}**\n`;
    md += `   - **Path**: ${toLocalFileMarkdownLink(r.path)}\n`;
    md += `   - **Type**: ${r.isDir ? 'Directory' : 'File'}\n`;
    if (!r.isDir && typeof r.size === 'number') {
      md += `   - **Size (bytes)**: ${r.size.toLocaleString()}\n`;
    }
    if (!r.isDir && typeof r.mtime === 'number' && r.mtime > 0) {
      md += `   - **Last modified**: ${formatModifiedTimestamp(r.mtime)}\n`;
    }
    md += '\n';
  });

  return { result: md.trimEnd() + '\n', rawData: payload };
}

function appendAssistantActionBlock(md: string, actions: string[]): string {
  if (!actions.length) return md;
  const block =
    '**Assistant action (invoke yourself — do not delegate to the user):**\n\n'
    + actions.map((a) => `- ${a}`).join('\n')
    + '\n\n';
  return block + md;
}

/**
 * Formats local_get_context JSON into Markdown with model-directed follow-up hints.
 */
export function formatGetContext(data: any): FormattedToolResult {
  if (!data || typeof data !== 'object') return { result: String(data), rawData: data };

  const assistantActions: string[] = [];
  let md = '### Code context\n\n';
  md += `- **Query**: ${data.query ?? '(unknown)'}\n`;
  md += `- **Type**: ${data.type ?? '(unknown)'}\n`;

  if (data.type === 'project_overview' && data.projectOverview) {
    const po = data.projectOverview;
    const root = typeof po.root === 'string' ? po.root : '';
    const indexed = typeof po.indexedFiles === 'number' ? po.indexedFiles : 0;
    const entries = Array.isArray(po.directory?.entries) ? po.directory.entries : [];
    const hasSrc = entries.some(
      (e: { name?: string; kind?: string }) => e?.name === 'src' && e?.kind === 'directory',
    );
    const name = po.projectName ?? (root ? pathBase(root) : 'project');

    md += `- **Project**: ${name}\n`;
    if (root) md += `- **Root**: ${toLocalFileMarkdownLink(root)}\n`;
    md += `- **Indexed files**: ${indexed.toLocaleString()}\n`;
    if (typeof po.indexedChunks === 'number') {
      md += `- **Indexed chunks**: ${po.indexedChunks.toLocaleString()}\n`;
    }

    if (po.git && typeof po.git === 'object') {
      const g = po.git;
      if (g.isRepo) {
        md += `- **Git branch**: ${g.branch ?? 'unknown'}${g.isDirty ? ' (dirty)' : ''}\n`;
      }
    }

    if (hasSrc && indexed < 20 && root) {
      assistantActions.push(
        `Only ${indexed} file(s) indexed but \`src/\` exists — use \`local_grep\` and \`local_read_file\` on disk until index tools are available.`,
      );
    }

    if (typeof po.architectureMarkdown === 'string' && po.architectureMarkdown.trim()) {
      md += '\n' + po.architectureMarkdown.trim() + '\n';
    }
  } else if (data.type === 'directory_overview' && data.directoryOverview) {
    const d = data.directoryOverview;
    if (typeof d.path === 'string') md += `- **Directory**: ${toLocalFileMarkdownLink(d.path)}\n`;
    if (typeof d.indexedFilesUnderPath === 'number') {
      md += `- **Indexed files under path**: ${d.indexedFilesUnderPath.toLocaleString()}\n`;
    }
    if (typeof data.note === 'string' && data.note.trim()) {
      md += `\n_${data.note.trim()}_\n`;
    }
  } else if (data.type === 'not_found') {
    if (typeof data.note === 'string' && data.note.trim()) {
      md += `\n_${data.note.trim()}_\n`;
    }
    assistantActions.push(
      'Path missing on disk — verify spelling with `local_list_directory` or ask the user once; do not paste tool invocations for them to run.',
    );
  } else if (typeof data.note === 'string' && data.note.trim()) {
    md += `\n_${data.note.trim()}_\n`;
  }

  md = appendAssistantActionBlock(md, assistantActions);
  return { result: md.trimEnd() + '\n', rawData: data };
}

/**
 * Formats Read File results, especially useful for long content.
 */
export function formatReadFile(data: any): FormattedToolResult {
  if (!data || typeof data !== 'object') return { result: String(data), rawData: data };

  const {
    path,
    bytes_read,
    truncated,
    content,
    mode,
    total_lines,
    totalLines,
    line_start,
    line_end,
    linesReturned,
    lines_read,
    line_count_omitted,
    truncated_below,
    status,
    resolvedVia,
    truncationNotice,
    error,
  } = data;

  const total = typeof total_lines === 'number' ? total_lines : totalLines;
  const lineStart = line_start ?? linesReturned?.[0];
  const lineEnd = line_end ?? linesReturned?.[1];

  if (status === 'error' || error) {
    return { result: String(error ?? content ?? 'Read failed'), rawData: data };
  }

  if (status === 'skipped') {
    let md = `### Read file\n\n`;
    md += `- **Path**: ${toLocalFileMarkdownLink(path ?? '')}\n`;
    md += `- **Status**: skipped\n`;
    if (truncationNotice) {
      md += `\n${truncationNotice}\n`;
    } else if (content) {
      md += `\n${content}\n`;
    }
    return { result: md, rawData: data };
  }

  let md = `### Read file\n\n`;
  md += `- **Path**: ${toLocalFileMarkdownLink(path ?? '')}\n`;

  if (resolvedVia) {
    md += `- **Resolved via**: ${resolvedVia}\n`;
  }

  if (mode === 'lines' || mode === 'index') {
    if (line_count_omitted) {
      md += `- **Total lines**: _(file too large to count; limit is ${(50_000_000 / 1_000_000).toFixed(0)} MB)_\n`;
    } else if (typeof total === 'number') {
      md += `- **Total lines**: ${total.toLocaleString()}\n`;
    }
    if (typeof lineStart === 'number' && typeof lineEnd === 'number') {
      md += `- **Lines shown**: ${lineStart.toLocaleString()}–${lineEnd.toLocaleString()}\n`;
    } else if (typeof lineStart === 'number') {
      md += `- **Start line**: ${lineStart.toLocaleString()}\n`;
    }
    if (typeof lines_read === 'number') {
      md += `- **Lines read**: ${lines_read.toLocaleString()}\n`;
    }
    if (truncationNotice) {
      md += `- **Truncated**: Yes — ${truncationNotice}\n`;
    } else if (truncated_below === true || status === 'truncated' || truncated === true) {
      md += `- **Truncated**: Yes (more content available — paginate with \`start_line\` / \`max_lines\`)\n`;
    }
  } else if (mode === 'index') {
    if (typeof total === 'number') {
      md += `- **Total lines**: ${total.toLocaleString()}\n`;
    }
  } else {
    md += `- **Bytes read**: ${bytes_read?.toLocaleString() ?? 0}\n`;
    if (line_count_omitted) {
      md += `- **Total lines**: _(file too large to count)_\n`;
    } else if (typeof total === 'number') {
      md += `- **Total lines**: ${total.toLocaleString()}\n`;
    }
    if (truncationNotice) {
      md += `- **Truncated**: Yes — ${truncationNotice}\n`;
    } else if (truncated === true || status === 'truncated') {
      md += `- **Truncated**: Yes (byte limit — use \`start_line\` / \`max_lines\` for precise windows)\n`;
    }
  }

  const body = typeof content === 'string' ? content : '';
  md += `\n\`\`\`\n${escapeBackticks(body)}\n\`\`\`\n`;

  return { result: md, rawData: data };
}

const READ_IMAGE_OCR_SNIPPET_CHARS = 2000;
const DEFAULT_BATCH_MAX_IMAGES = 10;
const HARD_BATCH_MAX_IMAGES = 20;

function truncateOcrSnippet(text: string, maxChars = READ_IMAGE_OCR_SNIPPET_CHARS): {
  text: string;
  truncated: boolean;
} {
  if (text.length <= maxChars) return { text, truncated: false };
  return {
    text: text.slice(0, maxChars) + '\n… (OCR truncated)',
    truncated: true,
  };
}

/** Format local_read_image OCR + object detection results. */
export function formatReadImage(data: any): FormattedToolResult {
  if (!data || typeof data !== 'object') return { result: String(data), rawData: data };

  const {
    path,
    name,
    extension,
    url,
    source,
    indexed,
    ocr_text,
    tags,
    objects,
    errors,
    content_truncated,
  } = data;

  let md = `### Read image\n\n`;
  if (path) {
    md += `${toLocalFileMarkdownImage(path, name)}\n\n`;
    md += `- **Path**: ${toLocalFileMarkdownLink(path)}\n`;
  }
  if (name) md += `- **Name**: ${name}\n`;
  if (extension) md += `- **Extension**: ${extension}\n`;
  if (url) md += `- **URL**: ${url}\n`;
  if (source) md += `- **Source**: ${source}${indexed ? ' (indexed cache)' : ''}\n`;
  if (content_truncated) {
    md += `- **Note**: Indexed OCR text was truncated — use \`force_live: true\` for a fresh full extraction if needed.\n`;
  }

  const objList = Array.isArray(objects) ? objects : [];
  if (objList.length > 0) {
    md += `- **Objects detected**: ${objList.join(', ')}\n`;
  } else if (Array.isArray(tags) && tags.length > 0) {
    const filtered = tags.filter((t: string) => !['image', 'ocr'].includes(String(t).toLowerCase()));
    if (filtered.length > 0) {
      md += `- **Tags**: ${filtered.join(', ')}\n`;
    }
  }

  const errList = Array.isArray(errors) ? errors.filter(Boolean) : [];
  if (errList.length > 0) {
    md += `- **Warnings**: ${errList.join(' | ')}\n`;
  }

  const rawText = typeof ocr_text === 'string' ? ocr_text.trim() : '';
  const { text, truncated: ocrTruncated } = truncateOcrSnippet(rawText);
  md += `\n#### OCR text\n\n`;
  if (text) {
    if (ocrTruncated) {
      md += `- **Note**: OCR snippet capped at ${READ_IMAGE_OCR_SNIPPET_CHARS} chars — use \`force_live: true\` on a single path if you need more.\n\n`;
    }
    md += `\`\`\`\n${escapeBackticks(text)}\n\`\`\`\n`;
  } else {
    md += `_(no text detected)_\n`;
  }

  return { result: md, rawData: data };
}

/** Format multi-image local_read_image batch results for the model. */
export function formatReadImageBatch(batch: {
  results: Array<{
    path?: string;
    status?: string;
    error?: string;
    data?: any;
  }>;
  batchMeta?: {
    isBatch?: boolean;
    requested?: number;
    analyzed?: number;
    max_images?: number;
    truncated?: boolean;
  };
}): FormattedToolResult {
  const results = Array.isArray(batch?.results) ? batch.results : [];
  if (results.length === 0) {
    return { result: 'No images analyzed.', rawData: batch };
  }
  if (results.length === 1 && !batch.batchMeta?.isBatch) {
    const item = results[0];
    if (item.status === 'error') {
      return { result: `### Read image\n\n**Error**: ${item.error ?? 'failed'}\n`, rawData: batch };
    }
    return formatReadImage(item.data);
  }

  const meta = batch.batchMeta;
  let md = `### Batch image read (${results.length} paths)\n\n`;

  if (meta) {
    if (typeof meta.max_images === 'number') {
      md += `- **Max images**: ${meta.max_images} (default ${DEFAULT_BATCH_MAX_IMAGES}, hard max ${HARD_BATCH_MAX_IMAGES})\n`;
    }
    if (typeof meta.requested === 'number' && meta.requested !== results.length) {
      md += `- **Requested**: ${meta.requested}\n`;
    }
    if (meta.truncated) {
      md += `- **Truncated**: Yes — only the first ${meta.analyzed ?? results.length} paths were analyzed\n`;
    }
    md += `- **Per-image errors do not fail the batch** — check ERROR rows below.\n\n`;
    md += `| # | File | Status |\n|---|------|--------|\n`;
    results.forEach((item, i) => {
      const status = item.status === 'error' ? 'ERROR' : 'OK';
      const name = pathBase(item.path);
      md += `| ${i + 1} | ${name} | ${status} |\n`;
    });
    md += '\n';
  }

  results.forEach((item, i) => {
    md += `#### ${i + 1}. ${item.path ?? 'image'}\n\n`;
    if (item.status === 'error') {
      md += `**Error**: ${item.error ?? 'failed'}\n\n`;
      return;
    }
    const { result } = formatReadImage(item.data);
    md += result.replace(/^### Read image\n\n/, '');
    md += '\n';
  });

  return { result: md.trimEnd() + '\n', rawData: batch };
}


/** Format multi-file read_file batch results for the model. */
export function formatReadFileBatch(batch: {
  results: any[];
  batchMeta?: {
    modelContextTokens?: number;
    budgetTokens?: number;
    budgetChars?: number;
    charsUsed?: number;
    budgetFraction?: number;
    isBatch?: boolean;
  };
}): FormattedToolResult {
  const results = Array.isArray(batch?.results) ? batch.results : [];
  if (results.length === 0) {
    return { result: 'No files read.', rawData: batch };
  }
  if (results.length === 1 && !batch.batchMeta?.isBatch) {
    return formatReadFile(results[0]);
  }

  const meta = batch.batchMeta;
  let md = `### Batch read (${results.length} paths)\n\n`;

  if (meta) {
    const pct = Math.round((meta.budgetFraction ?? 0.4) * 100);
    md += `- **Budget**: ${pct}% of model context`;
    if (meta.modelContextTokens) {
      md += ` (${meta.modelContextTokens.toLocaleString()} tokens → ~${meta.budgetTokens?.toLocaleString() ?? '?'} token pool)`;
    }
    md += '\n';
    if (typeof meta.budgetChars === 'number' && typeof meta.charsUsed === 'number') {
      md += `- **Used**: ${meta.charsUsed.toLocaleString()} / ${meta.budgetChars.toLocaleString()} chars\n`;
    }
    md += `- **Order matters** — put important files first; later files may be skipped when budget runs out.\n`;
    md += `- **Do not** treat PARTIAL or SKIPPED files as fully read.\n\n`;
    md += `| # | File | Status |\n|---|------|--------|\n`;
    results.forEach((item, i) => {
      const status = summarizeBatchItemStatus(item);
      const name = item.path ? pathBase(item.path) : 'file';
      md += `| ${i + 1} | ${name} | ${status} |\n`;
    });
    md += '\n';
  } else {
    md += `Read files (${results.length})\n\n`;
  }

  results.forEach((item, i) => {
    if (item.status === 'skipped' && !item.linesReturned && !item.content?.includes('\t')) {
      md += `#### ${i + 1}. ${item.path ?? 'file'}\n\n`;
      md += `${item.content || item.truncationNotice || '_Skipped._'}\n\n`;
      return;
    }
    const { result } = formatReadFile(item);
    md += `#### ${i + 1}. ${item.path ?? 'file'}\n\n`;
    md += result.replace(/^### Read file\n\n/, '');
    md += '\n';
  });

  return { result: md.trimEnd() + '\n', rawData: batch };
}

function summarizeBatchItemStatus(item: {
  status?: string;
  linesReturned?: [number, number];
  totalLines?: number;
  skipReason?: string;
}): string {
  if (item.status === 'skipped') {
    if (item.skipReason === 'denylist') return 'SKIPPED (denylist)';
    if (item.skipReason === 'max_paths') return 'SKIPPED (max paths)';
    return 'SKIPPED (budget exhausted)';
  }
  if (item.status === 'error') return 'ERROR';
  if (item.status === 'truncated') {
    const range = item.linesReturned;
    if (range && item.totalLines && range[1] < item.totalLines) {
      return `PARTIAL lines ${range[0]}–${range[1]} of ${item.totalLines}`;
    }
    return 'PARTIAL';
  }
  if (item.status === 'ok') return 'full';
  return item.status ?? '?';
}

/**
 * Formats Shell execution results into a clean Markdown block.
 */
export function formatShellResult(data: any): FormattedToolResult {
  if (!data || typeof data !== 'object') return { result: String(data), rawData: data };
  const { stdout, stderr, exit_code } = data;

  let md = `### Shell output\n\n`;
  md += `- **Exit code**: ${exit_code ?? '?'}\n\n`;

  if (stdout && stdout.trim()) {
    md += `**Stdout**\n\n\`\`\`\n${escapeBackticks(stdout.trim())}\n\`\`\`\n\n`;
  }

  if (stderr && stderr.trim()) {
    md += `**Stderr**\n\n\`\`\`\n${escapeBackticks(stderr.trim())}\n\`\`\`\n\n`;
  }

  if (!stdout?.trim() && !stderr?.trim()) {
    md += '*Command produced no output.*\n';
  }

  return { result: md.trimEnd() + '\n', rawData: data };
}

/**
 * Escapes triple backticks to prevent Markdown injection/hijacking.
 */
function escapeBackticks(text: string): string {
  if (!text) return '';
  // Replace triple backticks with a slightly modified version that won't terminate the block
  return text.replace(/```/g, '` ` `');
}

function pathBase(p: string | undefined): string {
  if (!p) return '';
  return p.split(/[\\/]/).pop() || p;
}

/** Seconds vs ms — values below ~Sep 2001 in ms are treated as Unix seconds. */
function normalizeMtimeMs(mtime: number): number {
  if (!Number.isFinite(mtime) || mtime <= 0) return mtime;
  return mtime < 1e12 ? mtime * 1000 : mtime;
}

function formatModifiedTimestamp(mtime: number): string {
  return new Date(normalizeMtimeMs(mtime)).toLocaleString();
}
