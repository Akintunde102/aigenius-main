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
}

/** Message sent to an extraction worker thread. */
export interface WorkerInput {
  path: string;
  mtime: number;
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
  /** Directories to watch and index. */
  watchPaths: string[];
  /** Absolute path to the SQLite database file. */
  dbPath: string;
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
