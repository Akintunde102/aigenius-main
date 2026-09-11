import path from 'path';

export const LIST_DIRECTORY_MIN_LIMIT = 1;
export const LIST_DIRECTORY_MAX_LIMIT = 1000;
export const LIST_DIRECTORY_DEFAULT_LIMIT = 100;

export type ParsedListDirectoryArgs = {
  recursive: boolean;
  pattern: string;
  extensions: string[] | null;
  limit: number;
  summaryOnly: boolean;
};

function normalizeExtensionToken(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim().toLowerCase().replace(/^\.+/, '');
  return trimmed || null;
}

export function parseListDirectoryExtensions(raw: unknown): string[] | null {
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const extensions = raw
    .map(normalizeExtensionToken)
    .filter((ext): ext is string => ext !== null);
  return extensions.length > 0 ? extensions : null;
}

export function parseListDirectoryLimit(raw: unknown): number {
  if (typeof raw !== 'number' || !Number.isFinite(raw)) {
    return LIST_DIRECTORY_DEFAULT_LIMIT;
  }
  return Math.min(
    Math.max(LIST_DIRECTORY_MIN_LIMIT, Math.floor(raw)),
    LIST_DIRECTORY_MAX_LIMIT,
  );
}

export function parseListDirectoryPattern(raw: unknown): string {
  return typeof raw === 'string' ? raw.trim() : '';
}

export function parseListDirectoryToolArgs(args: Record<string, unknown>): ParsedListDirectoryArgs {
  return {
    recursive: args.recursive === true,
    pattern: parseListDirectoryPattern(args.pattern),
    extensions: parseListDirectoryExtensions(args.extensions),
    limit: parseListDirectoryLimit(args.limit),
    summaryOnly: args.summary_only === true,
  };
}

export function filePassesExtensionFilter(fileName: string, extensions: string[] | null): boolean {
  if (!extensions || extensions.length === 0) return true;
  const ext = path.extname(fileName).toLowerCase().replace(/^\./, '');
  return extensions.includes(ext);
}
