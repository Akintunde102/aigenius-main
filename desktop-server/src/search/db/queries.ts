// Barrel re-exports — split modules preserve stable import paths.
export { cleanFtsTerm } from './queries-fts.js';
export { ragQuery, type RagHit, type RagQueryResult } from './queries-rag.js';
export {
  searchFiles,
  upsertFile,
  deleteFile,
  checkMtime,
  checkContentHash,
} from './queries-index-mutations.js';
export {
  browseFileIndex,
  browseFolderGroups,
  type BrowseFileIndexOptions,
  type BrowseFileIndexSortDirection,
  type FileIndexBrowseRow,
  type FileIndexBrowseSortColumn,
  type BrowseFolderGroupsOptions,
  type FolderGroupSortKey,
  type FolderGroupSummaryRow,
} from './queries-browse.js';
export {
  browseExplorerDirectory,
  type BrowseExplorerDirectoryOptions,
  type BrowseExplorerDirectoryResult,
  type ExplorerFolderRow,
} from './queries-explorer.js';
export {
  getFileIndexRow,
  getStatus,
  purgeExemptedFiles,
  touchFileAccess,
  getGraphCoverageStats,
  type FileIndexDetailRow,
  type GraphCoverageStats,
} from './queries-detail.js';
