export const LIST_DIRECTORY_AGGREGATION_SCAN_MAX = 50_000;

export const NO_EXTENSION_GROUP = '[no extension]';
export const HIDDEN_CONFIG_GROUP = '[hidden/config]';

export type DirectoryAggregation = {
  unfilteredTotal: number;
  totalEntries: number;
  totalFiles: number;
  totalDirs: number;
  extensionCounts: Record<string, number>;
  scanCapped: boolean;
};

export function emptyDirectoryAggregation(): DirectoryAggregation {
  return {
    unfilteredTotal: 0,
    totalEntries: 0,
    totalFiles: 0,
    totalDirs: 0,
    extensionCounts: {},
    scanCapped: false,
  };
}

export function classifyFileExtensionGroup(fileName: string): string {
  const base = fileName.replace(/^.*[/\\]/, '');
  const dot = base.lastIndexOf('.');
  if (dot <= 0) {
    if (base.startsWith('.') && base.length > 1) {
      return HIDDEN_CONFIG_GROUP;
    }
    return NO_EXTENSION_GROUP;
  }
  return `.${base.slice(dot + 1).toLowerCase()}`;
}

export function incrementExtensionCount(
  counts: Record<string, number>,
  fileName: string,
): void {
  const group = classifyFileExtensionGroup(fileName);
  counts[group] = (counts[group] ?? 0) + 1;
}

export function formatExtensionCounts(counts: Record<string, number>): string {
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .map(([ext, n]) => `${n} ${ext}`)
    .join(', ');
}

export function inferAggregationFromItems(
  items: Array<{ name: string; isDir: boolean }>,
): DirectoryAggregation {
  const aggregation = emptyDirectoryAggregation();
  aggregation.unfilteredTotal = items.length;
  aggregation.totalEntries = items.length;
  for (const item of items) {
    if (item.isDir) {
      aggregation.totalDirs += 1;
    } else {
      aggregation.totalFiles += 1;
      incrementExtensionCount(aggregation.extensionCounts, item.name);
    }
  }
  return aggregation;
}
