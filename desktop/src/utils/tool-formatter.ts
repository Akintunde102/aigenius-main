/**
 * Utilities to format raw tool results into human-readable Markdown.
 */

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
      md += '*The local index is empty — run `local_index_rescan` or use `local_list_directory`.*';
    } else {
      md += '*No matches found for this query in the local index.*';
    }
    return { result: md, rawData: data };
  }

  let md = `### Local search\n\n`;
  md += `- **Matches**: ${count}\n\n`;

  hits.forEach((hit, i) => {
    md += `${i + 1}. **${hit.name || pathBase(hit.path) || 'Unknown File'}**\n`;
    if (hit.path) {
      md += `   - **Path**: \`${hit.path}\`\n`;
    }
    if (typeof hit.score === 'number') {
      md += `   - **Relevance**: ${(hit.score * 100).toFixed(1)}%\n`;
    }
    if (typeof hit.mtime === 'number' && hit.mtime > 0) {
      const lastModified = new Date(hit.mtime).toLocaleString();
      md += `   - **Last modified**: ${lastModified}\n`;
    }

    // Add any unknown fields for compatibility
    const knownKeys = ['path', 'name', 'score', 'snippet', 'mtime'];
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

/**
 * Formats Index Status results into a clean Markdown summary.
 */
export function formatIndexStatus(data: any): FormattedToolResult {
  if (!data || typeof data !== 'object') return { result: String(data), rawData: data };

  const indexed = typeof data.indexed === 'number' ? data.indexed.toLocaleString() : 'Unknown';
  const watching = data.watching ? 'Active' : 'Inactive';
  const lastRun = data.lastRun ? new Date(data.lastRun).toLocaleString() : 'Never';
  const inProgress = data.scan_in_progress ? 'Yes' : 'No';

  let md = '### Local index status\n\n';
  md += `- **Files indexed**: ${indexed}\n`;
  md += `- **Watcher**: ${watching}\n`;
  md += `- **Last index run**: ${lastRun}\n`;
  md += `- **Scan in progress**: ${inProgress}\n`;

  // Append extra fields for compatibility
  const knownKeys = ['indexed', 'watching', 'lastRun', 'scan_in_progress'];
  const extraKeys = Object.keys(data).filter(k => !knownKeys.includes(k));
  if (extraKeys.length > 0) {
    md += '\n**Additional fields**\n\n';
    extraKeys.forEach(k => {
      md += `- **${k}**: ${JSON.stringify(data[k])}\n`;
    });
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
}): FormattedToolResult {
  const { path: rootPath, items, hitLimit } = payload;
  let md = '### Directory listing\n\n';
  md += `- **Directory**: \`${rootPath}\`\n`;
  md += `- **Entries**: ${items.length}${hitLimit ? ' (limit reached)' : ''}\n\n`;

  if (items.length === 0) {
    md += '*No entries matched (or directory is empty).*';
    return { result: md, rawData: payload };
  }

  items.forEach((r, i) => {
    md += `${i + 1}. **${r.name}**\n`;
    md += `   - **Path**: \`${r.path}\`\n`;
    md += `   - **Type**: ${r.isDir ? 'Directory' : 'File'}\n`;
    if (!r.isDir && typeof r.size === 'number') {
      md += `   - **Size (bytes)**: ${r.size.toLocaleString()}\n`;
    }
    if (!r.isDir && typeof r.mtime === 'number' && r.mtime > 0) {
      md += `   - **Last modified**: ${new Date(r.mtime).toLocaleString()}\n`;
    }
    md += '\n';
  });

  return { result: md.trimEnd() + '\n', rawData: payload };
}

/**
 * Formats background reindex acknowledgement.
 */
export function formatIndexRescan(data: { queued?: number }): FormattedToolResult {
  const q = typeof data.queued === 'number' ? data.queued : 0;
  let md = '### Local index rescan\n\n';
  md += `- **Started**: Yes\n`;
  md += `- **Paths queued**: ${q.toLocaleString()}\n\n`;
  md += '*Paths are re-queued for background indexing.*';
  return { result: md, rawData: data };
}

/**
 * Formats Read File results, especially useful for long content.
 */
export function formatReadFile(data: any): FormattedToolResult {
  if (!data || typeof data !== 'object') return { result: String(data), rawData: data };

  const { path, bytes_read, truncated, content } = data;

  let md = `### Read file\n\n`;
  md += `- **Path**: \`${path ?? ''}\`\n`;
  md += `- **Bytes read**: ${bytes_read?.toLocaleString() ?? 0}\n`;
  if (truncated === true) {
    md += `- **Truncated**: Yes (size limits)\n`;
  }
  md += `\n\`\`\`\n${escapeBackticks(content)}\n\`\`\`\n`;

  return { result: md, rawData: data };
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
