export type DirectoryListingItem = {
  name: string;
  path: string;
  isDir: boolean;
  size?: number;
  mtimeMs?: number;
};

export type ParsedDirectoryListing = {
  directoryPath: string;
  entryCount: number;
  hitLimit: boolean;
  shellCommand?: string;
  terminalOutput?: string;
  items: DirectoryListingItem[];
};

/** Seconds vs ms — values below ~Sep 2001 in ms are treated as Unix seconds. */
export function normalizeMtimeMs(mtime: number): number {
  if (!Number.isFinite(mtime) || mtime <= 0) return mtime;
  return mtime < 1e12 ? mtime * 1000 : mtime;
}

export function formatFileSize(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(bytes < 10_240 ? 1 : 0)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
}

export function formatModifiedDate(mtimeMs: number): string {
  const date = new Date(normalizeMtimeMs(mtimeMs));
  if (Number.isNaN(date.getTime())) return '—';

  const now = Date.now();
  const diffMs = now - date.getTime();
  const dayMs = 86_400_000;

  if (diffMs >= 0 && diffMs < dayMs) {
    return `Today ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (diffMs >= dayMs && diffMs < dayMs * 2) {
    return `Yesterday ${date.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}`;
  }
  if (diffMs >= 0 && diffMs < dayMs * 7) {
    return date.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' });
  }

  return date.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

function parsePathFromMarkdownLink(fragment: string): string {
  const linkMatch = fragment.match(/\[([^\]]*)\]\(([^)]+)\)/);
  if (linkMatch?.[2]) {
    const href = linkMatch[2].trim();
    if (href.startsWith('local-file://')) {
      try {
        return decodeURIComponent(href.slice('local-file://'.length));
      } catch {
        return href.slice('local-file://'.length);
      }
    }
    return href;
  }
  return fragment.trim();
}

function parseSizeBytes(raw: string | undefined): number | undefined {
  if (!raw) return undefined;
  const n = Number.parseInt(raw.replace(/,/g, ''), 10);
  return Number.isFinite(n) ? n : undefined;
}

function tryParseListingFromRawData(value: unknown): ParsedDirectoryListing | null {
  if (!value || typeof value !== 'object') return null;
  const obj = value as Record<string, unknown>;

  const nested = obj.rawData && typeof obj.rawData === 'object' ? obj.rawData as Record<string, unknown> : null;
  const payload = nested ?? (
    Array.isArray(obj.items) && typeof obj.path === 'string' ? obj : null
  );
  if (!payload) return null;

  const items = Array.isArray(payload.items) ? payload.items : [];
  const parsedItems: DirectoryListingItem[] = [];

  for (const row of items) {
    if (!row || typeof row !== 'object') continue;
    const record = row as Record<string, unknown>;
    const name = typeof record.name === 'string' ? record.name : '';
    const itemPath = typeof record.path === 'string' ? record.path : '';
    if (!name || !itemPath) continue;

    const item: DirectoryListingItem = {
      name,
      path: itemPath,
      isDir: !!record.isDir,
    };
    if (!item.isDir && typeof record.size === 'number') {
      item.size = record.size;
    }
    if (!item.isDir && typeof record.mtime === 'number' && record.mtime > 0) {
      item.mtimeMs = normalizeMtimeMs(record.mtime);
    }
    parsedItems.push(item);
  }

  return {
    directoryPath: typeof payload.path === 'string' ? payload.path : '',
    entryCount: parsedItems.length,
    hitLimit: !!payload.hitLimit,
    shellCommand: typeof payload.shellCommand === 'string' ? payload.shellCommand : undefined,
    terminalOutput: typeof payload.terminalOutput === 'string' ? payload.terminalOutput : undefined,
    items: sortListingItems(parsedItems),
  };
}

export function sortListingItems(items: DirectoryListingItem[]): DirectoryListingItem[] {
  return [...items].sort((a, b) => {
    if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
  });
}

function parseListingItemBlock(block: string): DirectoryListingItem | null {
  const nameMatch = block.match(/^\d+\.\s+\*\*([^*]+)\*\*/);
  if (!nameMatch?.[1]) return null;

  const pathMatch = block.match(/\*\*Path\*\*:\s*(.+)/i);
  const typeMatch = block.match(/\*\*Type\*\*:\s*(Directory|File)/i);
  const sizeMatch = block.match(/\*\*Size \(bytes\)\*\*:\s*([\d,]+)/i);
  const mtimeMatch = block.match(/\*\*Last modified\*\*:\s*(.+)/i);

  const pathLine = pathMatch?.[1]?.trim() ?? '';
  const itemPath = parsePathFromMarkdownLink(pathLine);
  const isDir = typeMatch?.[1]?.toLowerCase() === 'directory';

  const item: DirectoryListingItem = {
    name: nameMatch[1].trim(),
    path: itemPath || nameMatch[1].trim(),
    isDir,
  };

  if (!isDir) {
    const size = parseSizeBytes(sizeMatch?.[1]);
    if (size !== undefined) item.size = size;
    if (mtimeMatch?.[1]) {
      const parsed = Date.parse(mtimeMatch[1].trim());
      if (Number.isFinite(parsed)) item.mtimeMs = parsed;
    }
  }

  return item;
}

/** Parses `formatDirectoryListing` markdown (and optional rawData JSON) into structured rows. */
export function parseDirectoryListingResult(result: string | undefined): ParsedDirectoryListing | null {
  if (!result?.trim()) return null;

  try {
    const json = JSON.parse(result) as unknown;
    if (json && typeof json === 'object') {
      const fromRaw = tryParseListingFromRawData(json);
      if (fromRaw) return fromRaw;

      const obj = json as Record<string, unknown>;
      const nested = typeof obj.result === 'string' ? obj.result : undefined;
      if (nested) {
        const fromNestedRaw = tryParseListingFromRawData(json);
        if (fromNestedRaw) return fromNestedRaw;
        const fromMarkdown = parseDirectoryListingMarkdown(nested);
        if (fromMarkdown) return fromMarkdown;
      }
    }
  } catch {
    // Not JSON — fall through to markdown.
  }

  return parseDirectoryListingMarkdown(result);
}

export function parseDirectoryListingMarkdown(markdown: string): ParsedDirectoryListing | null {
  const text = markdown.replace(/\\n/g, '\n').trim();
  if (!text.includes('Directory listing')) return null;

  const directoryMatch = text.match(/\*\*Directory\*\*:\s*(.+)/i);
  const entriesMatch = text.match(/\*\*Entries\*\*:\s*(\d+)(?:\s*\(limit reached\))?/i);
  const shellMatch = text.match(/\*\*Shell\*\*:\s*`([^`]+)`/);

  const codeFence = text.match(/```\n([\s\S]*?)\n```/);
  if (codeFence?.[1]?.trim()) {
    return {
      directoryPath: directoryMatch ? parsePathFromMarkdownLink(directoryMatch[1]) : '',
      entryCount: 0,
      hitLimit: false,
      shellCommand: shellMatch?.[1],
      terminalOutput: codeFence[1].trimEnd(),
      items: [],
    };
  }

  const itemBlocks = text.split(/\n(?=\d+\.\s+\*\*)/);
  const items: DirectoryListingItem[] = [];

  for (const block of itemBlocks) {
    if (!/^\d+\.\s+\*\*/.test(block.trim())) continue;
    const item = parseListingItemBlock(block.trim());
    if (item) items.push(item);
  }

  if (items.length === 0 && !text.includes('*No entries matched')) {
    return null;
  }

  return {
    directoryPath: directoryMatch ? parsePathFromMarkdownLink(directoryMatch[1]) : '',
    entryCount: entriesMatch ? Number.parseInt(entriesMatch[1], 10) : items.length,
    hitLimit: /\(limit reached\)/i.test(text),
    shellCommand: shellMatch?.[1],
    items: sortListingItems(items),
  };
}

export function fileExtensionLabel(name: string): string {
  const dot = name.lastIndexOf('.');
  if (dot <= 0 || dot === name.length - 1) return 'File';
  return name.slice(dot + 1).toUpperCase();
}

export function toLocalFileHref(path: string): string {
  return `local-file://${encodeURIComponent(path)}`;
}
