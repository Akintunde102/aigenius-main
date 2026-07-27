export type ReadFileMode = 'auto' | 'lines' | 'index';

export type ReadFileRequest = {
  path: string;
  start_line?: number;
  max_lines?: number;
  /** 0-based line offset alias; maps to start_line = offset + 1 */
  offset?: number;
  limit?: number;
  anchorSymbol?: string;
  mode?: ReadFileMode;
};

export type ReadFileResultStatus = 'ok' | 'truncated' | 'error' | 'skipped';

export type ReadFileSkipReason = 'budget_exhausted' | 'denylist' | 'max_paths';

export type ReadFileResolvedVia =
  | 'lineRange'
  | 'symbolAnchor'
  | 'docIndex'
  | 'lineRangeFallback'
  | 'bytes'
  | 'batchFull';

export type ReadFileItemResult = {
  path: string;
  status: ReadFileResultStatus;
  linesReturned?: [number, number];
  totalLines?: number;
  content: string;
  truncationNotice?: string;
  resolvedVia?: ReadFileResolvedVia;
  error?: string;
  mode?: 'lines' | 'bytes' | 'index';
  line_count_omitted?: boolean;
  bytes_read?: number;
  skipReason?: ReadFileSkipReason;
  /** Absolute resolved path (for preview registration; not shown to model). */
  resolvedPath?: string;
};

export type ReadFileBatchMeta = {
  modelContextTokens: number;
  budgetTokens: number;
  budgetChars: number;
  charsUsed: number;
  budgetFraction: number;
  isBatch: boolean;
};

export type ReadFileBatchResult = {
  results: ReadFileItemResult[];
  batchMeta?: ReadFileBatchMeta;
};

export type BatchReadBudget = {
  modelContextTokens: number;
  budgetTokens: number;
  budgetChars: number;
  maxPaths: number;
  budgetFraction: number;
};

export type SingleFileLineBudget = {
  maxLines: number;
};

/** @deprecated Use resolveBatchReadBudget / resolveSingleFileLineBudget */
export type ContextBudget = {
  maxChars: number;
  maxLines: number;
  maxFiles: number;
};
