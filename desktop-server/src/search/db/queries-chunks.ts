// Barrel re-exports — split modules preserve stable import paths.
export {
  deleteFileStructure,
  upsertFileStructure,
  upsertDeepGraph,
  listSymbolsForFile,
  searchSymbolsByName,
  countChunks,
  type SymbolRow,
} from './queries-chunks-structure.js';
export {
  type ChunkRagHit,
  ragQueryChunks,
  ragQuerySmart,
  formatSymbolOutline,
  buildProjectArchitecture,
} from './queries-chunks-rag.js';
