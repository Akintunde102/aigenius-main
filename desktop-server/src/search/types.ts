/** Represents a single search result returned to the renderer. */
export interface FileResult {
  path: string;
  name: string;
  mtime: number;
  excerpt: string;
  rank: number;
  tags: string;
}

/** Row stored in the `file_index` table. */
export interface IndexedFile {
  path: string;
  name: string;
  mtime: number;
  content: string;
  tags: string;
  extension?: string;
  content_hash?: string;
  language?: string;
  index_status?: string;
  is_generated?: number;
  last_indexed?: number;
}

/** Message sent to an extraction worker thread. */
export interface WorkerInput {
  path: string;
  mtime: number;
  /** When true, skip OCR/YOLO even if global skipImages is false. */
  skipImages?: boolean;
}

/** Message received back from an extraction worker thread. */
export interface WorkerOutput {
  path: string;
  mtime: number;
  content: string;
  tags: string[];
  error?: string;
}

/** Configuration for `registerSearchModule()`. */
export interface SearchModuleConfig {
  /** Active project root (high-priority watcher). */
  projectRoot?: string | null;
  /** Low-priority background paths (e.g. homedir for general search). */
  backgroundWatchPaths?: string[];
  /** Directories to watch and index (legacy; use projectRoot + backgroundWatchPaths). */
  watchPaths: string[];
  /** Absolute path to the SQLite database file. */
  dbPath: string;
  /** Persisted status JSON directory (Electron userData). */
  userDataPath?: string;
  /** Directory containing YOLO + Tesseract model files. */
  modelsDir: string;
  /** Number of worker threads (default: 4). */
  workerCount?: number;
  /** Files per batch before DB write (default: 10). */
  batchSize?: number;
  /** Batch flush interval in ms (default: 2000). */
  batchIntervalMs?: number;
  /** If true, skip OCR and YOLO for image files (default: false). */
  skipImageSearch?: boolean;
}
