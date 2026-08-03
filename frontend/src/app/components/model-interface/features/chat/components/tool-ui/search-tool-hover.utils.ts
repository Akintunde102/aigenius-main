import {
  extractReadFilePathsFromArgs,
  isReadFileTool,
  LIST_DIRECTORY_TOOL,
} from './tool-activity-label.utils';

export const SEARCH_TOOLS_WITH_FILE_HOVER = new Set([
  'local_grep',
  'local_rag_query',
  'local_get_context',
  'local_list_symbols',
  'local_find_references',
  'local_find_callers',
  'local_go_to_definition',
  'local_symbol_outline',
  'local_symbol_blast_radius',
  'local_import_blast_radius',
  'local_list_directory',
  'local_read_file',
  'read_file',
  'read_local_file',
]);

export type SearchToolFileEntry = {
  name: string;
  path: string;
  line?: number;
  lineEnd?: number;
};

export type SearchToolHoverPreview = {
  scopeLabel: string;
  files: SearchToolFileEntry[];
  headerLabel?: string;
};

export function isSearchToolWithFileHover(tool: string): boolean {
  return SEARCH_TOOLS_WITH_FILE_HOVER.has(tool);
}

export function buildSearchToolHoverPreview(
  tool: string,
  args: Record<string, unknown> | undefined,
  result: string | undefined,
): SearchToolHoverPreview | null {
  if (!isSearchToolWithFileHover(tool)) return null;

  const argReadPaths = isReadFileTool(tool) ? extractReadFilePathsFromArgs(args) : [];
  const files = argReadPaths.length > 0
    ? argReadPaths.map((filePath) => ({
      name: fileNameFromPath(filePath),
      path: filePath,
    }))
    : extractSearchToolFiles(tool, result);

  if (files.length === 0 && !result?.trim() && argReadPaths.length === 0) return null;

  const scopeLabel = buildSearchScopeLabel(tool, args);
  if (files.length === 0 && !scopeLabel) return null;

  return {
    scopeLabel,
    headerLabel: resolveHoverHeaderLabel(tool),
    files: files.map((f) => ({
      ...f,
      path: relativizePathForDisplay(f.path, args),
    })),
  };
}

function resolveHoverHeaderLabel(tool: string): string {
  if (isReadFileTool(tool)) return 'Read files';
  if (tool === LIST_DIRECTORY_TOOL) return 'Directory listing';
  return 'Searched files';
}

function buildSearchScopeLabel(tool: string, args: Record<string, unknown> | undefined): string {
  const prefix =
    pickString(args?.path_prefix)
    ?? pickString(args?.cwd)
    ?? pickString(args?.path)
    ?? pickString(args?.input);

  const rawExtensions = args?.extensions;
  const extensions = Array.isArray(rawExtensions)
    ? rawExtensions.filter((e): e is string => typeof e === 'string' && e.trim().length > 0)
    : [];

  if (prefix && extensions.length > 0) {
    const extList = extensions.map((ext) => ext.replace(/^\./, '')).join(',');
    return `${normalizePathSlashes(prefix)}/**/*.{${extList}}`;
  }

  if (prefix) {
    if (tool === LIST_DIRECTORY_TOOL) {
      return normalizePathSlashes(prefix);
    }
    return `${normalizePathSlashes(prefix)}/**/*`;
  }

  if (tool === 'local_grep' && pickString(args?.pattern)) {
    return `pattern: ${pickString(args?.pattern)}`;
  }

  if (tool === 'local_rag_query') {
    const content = pickString(args?.content_query) ?? pickString(args?.query);
    const pathQuery = pickString(args?.path_query);
    if (content && pathQuery) return `${pathQuery} · ${content}`;
    if (content) return content;
    if (pathQuery) return pathQuery;
  }

  return 'Searched files';
}

function extractSearchToolFiles(tool: string, result: string | undefined): SearchToolFileEntry[] {
  if (!result?.trim()) return [];

  const json = tryParseJson(result);
  if (json) {
    const fromJson = extractFilesFromJson(json, tool);
    if (fromJson.length > 0) return fromJson;
    const nested = nestedResultString(json);
    if (nested && nested !== result) {
      const nestedJson = tryParseJson(nested);
      if (nestedJson) {
        const fromNested = extractFilesFromJson(nestedJson, tool);
        if (fromNested.length > 0) return fromNested;
      }
      const fromNestedMarkdown = extractFilesFromMarkdown(tool, nested);
      if (fromNestedMarkdown.length > 0) return fromNestedMarkdown;
    }
  }

  return extractFilesFromMarkdown(tool, result);
}

function extractFilesFromJson(value: unknown, tool: string): SearchToolFileEntry[] {
  if (!value || typeof value !== 'object') return [];
  const obj = value as Record<string, unknown>;

  const hits = Array.isArray(obj.hits) ? obj.hits : null;
  if (hits) {
    return dedupeEntries(
      hits.flatMap((hit) => {
        if (!hit || typeof hit !== 'object') return [];
        const h = hit as Record<string, unknown>;
        const path = pickString(h.path);
        if (!path) return [];
        return [{
          name: pickString(h.name) ?? fileNameFromPath(path),
          path,
          line: pickLine(h.line_start ?? h.line),
          lineEnd: pickLine(h.line_end),
        }];
      }),
    );
  }

  const items = Array.isArray(obj.items) ? obj.items : null;
  if (items) {
    return dedupeEntries(
      items.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const row = item as Record<string, unknown>;
        const path = pickString(row.path);
        if (!path) return [];
        return [{
          name: pickString(row.name) ?? fileNameFromPath(path),
          path,
        }];
      }),
    );
  }

  const references = Array.isArray(obj.references) ? obj.references : null;
  if (references) {
    return dedupeEntries(
      references.flatMap((ref) => {
        if (!ref || typeof ref !== 'object') return [];
        const r = ref as Record<string, unknown>;
        const path = pickString(r.path);
        if (!path) return [];
        return [{
          name: pickString(r.name) ?? fileNameFromPath(path),
          path,
          line: pickLine(r.line),
        }];
      }),
    );
  }

  const symbols = Array.isArray(obj.symbols) ? obj.symbols : null;
  if (symbols) {
    return dedupeEntries(
      symbols.flatMap((sym) => {
        if (!sym || typeof sym !== 'object') return [];
        const s = sym as Record<string, unknown>;
        const path = pickString(s.path);
        if (!path) return [];
        return [{
          name: pickString(s.name) ?? fileNameFromPath(path),
          path,
          line: pickLine(s.line_start ?? s.line),
          lineEnd: pickLine(s.line_end),
        }];
      }),
    );
  }

  const results = Array.isArray(obj.results) ? obj.results : null;
  if (results && isReadFileTool(tool)) {
    return dedupeEntries(
      results.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const path = pickString((item as Record<string, unknown>).path);
        if (!path) return [];
        const row = item as Record<string, unknown>;
        return [{
          name: fileNameFromPath(path),
          path,
          line: pickLine(row.line_start ?? row.start_line),
          lineEnd: pickLine(row.line_end ?? row.end_line),
        }];
      }),
    );
  }

  const paths = Array.isArray(obj.paths) ? obj.paths : null;
  if (paths && tool.includes('blast')) {
    return dedupeEntries(
      paths.flatMap((p) => {
        const path = typeof p === 'string' ? p : pickString((p as Record<string, unknown>)?.path);
        if (!path) return [];
        return [{ name: fileNameFromPath(path), path }];
      }),
    );
  }

  const path = pickString(obj.path);
  if (path && (tool === 'local_read_file' || tool === 'read_file' || tool === 'read_local_file' || tool === 'local_go_to_definition')) {
    return [{
      name: fileNameFromPath(path),
      path,
      line: pickLine(obj.line_start ?? obj.line),
      lineEnd: pickLine(obj.line_end),
    }];
  }

  return [];
}

function extractFilesFromMarkdown(tool: string, result: string): SearchToolFileEntry[] {
  const entries: SearchToolFileEntry[] = [];

  if (isReadFileTool(tool)) {
    for (const line of result.split('\n')) {
      const headingMatch = line.match(/^####\s+\d+\.\s+(.+)$/);
      if (headingMatch?.[1]?.trim()) {
        const filePath = headingMatch[1].trim();
        entries.push({ name: fileNameFromPath(filePath), path: filePath });
        continue;
      }

      const tableMatch = line.match(/^\|\s*\d+\s*\|\s*([^|]+?)\s*\|/);
      if (tableMatch?.[1]?.trim() && !tableMatch[1].includes('---')) {
        const name = tableMatch[1].trim();
        entries.push({ name, path: name });
      }
    }

    if (entries.length > 0) return dedupeEntries(entries);
  }

  if (tool === 'local_grep') {
    for (const line of result.split('\n')) {
      const m = line.match(/^-\s+(.+?):(\d+)(?::(.*))?$/);
      if (!m) continue;
      const [, filePath, lineStr] = m;
      entries.push({
        name: fileNameFromPath(filePath),
        path: filePath,
        line: Number.parseInt(lineStr, 10),
      });
    }
    return dedupeEntries(entries);
  }

  const ragBlocks = result.split(/\n(?=\d+\.\s+\*\*)/);
  for (const block of ragBlocks) {
    const nameMatch = block.match(/^\d+\.\s+\*\*([^*]+)\*\*/);
    const pathMatch = block.match(/\*\*Path\*\*:\s*(?:\[[^\]]*\]\(([^)]+)\)|([^\n]+))/i);
    const locationMatch = block.match(/\*\*Location\*\*:\s*(?:lines?\s+)?(\d+)(?:[–-](\d+))?/i);
    const filePath = pathMatch?.[1] ?? pathMatch?.[2];
    if (!filePath?.trim()) continue;
    const cleanPath = filePath.trim();
    entries.push({
      name: nameMatch?.[1]?.trim() ?? fileNameFromPath(cleanPath),
      path: cleanPath,
      line: locationMatch ? Number.parseInt(locationMatch[1], 10) : undefined,
      lineEnd: locationMatch?.[2] ? Number.parseInt(locationMatch[2], 10) : undefined,
    });
  }
  if (entries.length > 0) return dedupeEntries(entries);

  for (const line of result.split('\n')) {
    const symbolMatch = line.match(/^-\s+(?:\w+\s+)?\*\*[^*]+\*\*\s+—\s+(.+?):(\d+)\s*$/);
    if (symbolMatch) {
      const [, filePath, lineStr] = symbolMatch;
      entries.push({
        name: fileNameFromPath(filePath),
        path: filePath,
        line: Number.parseInt(lineStr, 10),
      });
      continue;
    }

    const refMatch = line.match(/^-\s+(.+?):(\d+|\?)\s*(?:\([^)]+\))?/);
    if (refMatch) {
      const [, filePath, lineStr] = refMatch;
      if (lineStr === '?') {
        entries.push({ name: fileNameFromPath(filePath), path: filePath });
      } else {
        entries.push({
          name: fileNameFromPath(filePath),
          path: filePath,
          line: Number.parseInt(lineStr, 10),
        });
      }
    }
  }

  const directoryBlocks = result.matchAll(
    /^\d+\.\s+\*\*([^*]+)\*\*\s*\n\s*-\s+\*\*Path\*\*:\s*(?:\[[^\]]*\]\(([^)]+)\)|([^\n]+))/gim,
  );
  for (const match of Array.from(directoryBlocks)) {
    const name = match[1]?.trim();
    const filePath = (match[2] ?? match[3])?.trim();
    if (!filePath) continue;
    entries.push({
      name: name ?? fileNameFromPath(filePath),
      path: filePath,
    });
  }

  return dedupeEntries(entries);
}

function relativizePathForDisplay(filePath: string, args: Record<string, unknown> | undefined): string {
  const normalized = normalizePathSlashes(filePath);
  const roots = [
    pickString(args?.path_prefix),
    pickString(args?.cwd),
    pickString(args?.path),
    pickString(args?.input),
  ]
    .filter((r): r is string => Boolean(r))
    .map((r) => normalizePathSlashes(r).replace(/\/$/, ''));

  for (const root of roots) {
    const lowerRoot = root.toLowerCase();
    const lowerPath = normalized.toLowerCase();
    if (lowerPath === lowerRoot) {
      return `.${normalized.slice(root.length)}` || '.';
    }
    if (lowerPath.startsWith(`${lowerRoot}/`)) {
      return `.${normalized.slice(root.length)}`;
    }
  }

  return normalized.startsWith('./') ? normalized : `./${normalized.replace(/^\/+/, '')}`;
}

function dedupeEntries(entries: SearchToolFileEntry[]): SearchToolFileEntry[] {
  const seen = new Set<string>();
  const out: SearchToolFileEntry[] = [];
  for (const entry of entries) {
    const key = `${entry.path}:${entry.line ?? ''}:${entry.lineEnd ?? ''}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(entry);
  }
  return out;
}

function nestedResultString(json: Record<string, unknown>): string | undefined {
  const message = pickString(json.message);
  if (message) return message;
  const result = pickString(json.result);
  if (result) return result;
  return undefined;
}

function tryParseJson(value: string): Record<string, unknown> | null {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === 'object' ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}

function pickString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function pickLine(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) && value > 0 ? value : undefined;
}

function fileNameFromPath(filePath: string): string {
  const parts = normalizePathSlashes(filePath).split('/');
  return parts[parts.length - 1] || filePath;
}

function normalizePathSlashes(filePath: string): string {
  return filePath.replace(/\\/g, '/');
}

export function formatSearchToolLineLabel(entry: SearchToolFileEntry): string | null {
  if (entry.line == null) return null;
  if (entry.lineEnd != null && entry.lineEnd !== entry.line) {
    return `L${entry.line}–${entry.lineEnd}`;
  }
  return `L${entry.line}`;
}
