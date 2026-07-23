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

export type ReadFileResultStatus = 'ok' | 'truncated' | 'error';

export type ReadFileResolvedVia =
  | 'lineRange'
  | 'symbolAnchor'
  | 'docIndex'
  | 'lineRangeFallback'
  | 'bytes';

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
  /** Absolute resolved path (for preview registration; not shown to model). */
  resolvedPath?: string;
};

export type ReadFileBatchResult = {
  results: ReadFileItemResult[];
};

export type ContextBudget = {
  maxChars: number;
  maxLines: number;
  maxFiles: number;
};
