# Code intelligence (desktop search index)

This document describes **Phases 5–7** of AIGenius desktop code intelligence: symbol graph, chunked FTS, hybrid RAG, import blast radius, per-project SQLite, and open-editor context. It follows the same layered style as `backend/docs/ARCHITECTURE.md`.

## System overview

Code intelligence runs entirely in the **desktop mini-server** (`client/desktop-server`, default port `8001`). The Electron shell indexes the user’s **active code project**, exposes HTTP search routes, and wires **local `local_*` tools** through IPC. The Nest gateway injects **runtime context** (active project + open editor) into chat prompts.

```
┌────────────────────────────────────────────────────────────────────┐
│  Frontend (Next in Electron)                                       │
│  • CodeProjectRail + activeCodeProject (localStorage)              │
│  • FilePreviewModal → syncActiveEditor IPC                         │
│  • access-model.ts → runtimeContext on chat requests               │
└────────────────────────────┬───────────────────────────────────────┘
                             │ HTTP / IPC
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│  Electron main + local-tool-executor                               │
│  • applyEditorDefaultsToToolArgs (path, line, symbol)              │
│  • POST /search/* on mini-server                                   │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│  desktop-server (Hono)                                             │
│  Indexing: walkProjectFiles → upsertFile → upsertFileStructure     │
│  Query: ragQueryHybrid, list symbols, import blast radius          │
│  Storage: SQLite per project under {userData}/search-indexes/      │
└────────────────────────────┬───────────────────────────────────────┘
                             │
                             ▼
┌────────────────────────────────────────────────────────────────────┐
│  Nest gateway                                                      │
│  • code-projects CRUD (Postgres)                                   │
│  • buildRuntimeContextAppendix (active project + editor blocks)    │
│  • local-desktop tool definitions                                  │
└────────────────────────────────────────────────────────────────────┘
```

There is **no Code vs Project mode toggle**: one chat surface; the model uses tools and injected context naturally.

## SQLite schema (four layers)

| Layer | File | Tables | Purpose |
|-------|------|--------|---------|
| File index | `schema.sql` | `file_index`, `file_search` (FTS5) | Full-file text search, browse, mtime, content_hash |
| Symbol + chunks | `schema-chunks.sql` | `symbol_index`, `file_chunks`, `chunk_search`, `chunk_embeddings` | Symbol outline, symbol-bounded chunks, hybrid RAG |
| Import graph | `schema-import-graph.sql` | `import_index` | Resolved relative imports, blast radius BFS |
| Intelligence graph | `schema-intelligence.sql` | `symbol_edges`, `symbol_boundaries`, `makefile_targets`, `symbol_search` | Call graph, API/IPC boundaries, build deps, symbol FTS |

**Per-project DB:** `POST /search/switch-project` opens `{userData}/search-indexes/{projectId}.sqlite`. All structure tables live in the same file as the file index.

## Indexing pipeline

1. **Walk** — `walkProjectFiles` respects `.aigeniusignore` and `DEFAULT_IGNORED_PATHS` (relative-path checks on Windows).
2. **File row** — `upsertFile` updates `file_index` + FTS row.
3. **Structure** — `upsertFileStructure`:
   - Language map-drawer via `indexFileIntelligence` — **ts-morph** (TS/JS, high confidence), heuristic drawers for Python/Rust/C++/Makefile
   - `symbol_edges` — calls, extends, implements, imports
   - `symbol_boundaries` — HTTP routes, IPC, native bindings (pattern manifest)
   - `parseImports` + `resolveImports` → `import_index`
   - `buildFileChunksFromSymbols` → `file_chunks` + `chunk_search`
   - Optional `embedChunk` / backfill → `chunk_embeddings`

Re-index **replaces** prior symbols, chunks, imports, and embeddings for that path (`deleteFileStructure`).

## Search and ranking

| API / function | Behavior |
|----------------|----------|
| `ragQuery` | File-level FTS5 |
| `ragQueryChunks` | Chunk FTS5; symbol name in snippet |
| `ragQuerySmart` | Chunks when query non-empty; else file browse |
| `ragQueryHybrid` | RRF fusion of chunk FTS + vector similarity (`reciprocalRankFusion`, k=60) |
| `GET /search/symbols` | Filter by path prefix / kind |
| `POST /search/import-graph` | `computeBlastRadius` reverse BFS |
| `POST /search/project-architecture` | Markdown summary for retrieval memory |

**Embeddings:** `hash-embedder` (deterministic, always on) for tests and fallback; optional ONNX `all-MiniLM-L6-v2.onnx` via `embedder.ts` when model present in models dir.

## Local tools (desktop)

| Tool | Index / runtime use |
|------|---------------------|
| `local_rag_query` | `ragQueryHybrid`, optional `path_prefix` |
| `local_get_context` | `getContext` resolver — file → symbol → keyword → semantic |
| `local_symbol_outline` | `symbol_index` or file regex |
| `local_list_symbols` | Project-wide symbol listing |
| `local_import_blast_radius` | `computeBlastRadius` + markdown report |
| `local_go_to_definition` | `typescript-language-server` (LSP) |
| `local_find_references` | ripgrep |
| `apply_hunk` | Patch + edit session + re-index touched files |

**Editor defaults:** When the user has a file open in `FilePreviewModal`, main process stores `MainActiveEditor`; `applyEditorDefaultsToToolArgs` fills missing `path`, `line`, `character`, `symbol` for navigation tools.

## Runtime context (gateway prompt appendix)

On desktop chat, `buildRuntimeContextAppendix` adds:

- **Active code project** — name, root path, optional rules; reminds model to scope `path_prefix` to project root.
- **Open in editor** — path, cursor, selection; notes that desktop tools default from this context.

See `chat-runtime-context.appendix.spec.ts` snapshot for the exact block shape.

## Environment flags

| Variable | Effect |
|----------|--------|
| `AIGENIUS_TREE_SITTER=1` | TS/JS AST symbols (`typescript-ast-symbols.ts`) |
| `AIGENIUS_AUTO_INDEX_IF_EMPTY=1` | Legacy full-home scan when index empty |
| `AIGENIUS_SKIP_AUTO_INDEX=1` | Disable background indexing |

## Tests

Scenario coverage lives beside the implementation:

| File | Scenarios |
|------|-----------|
| `search/__tests__/code-intelligence.scenarios.spec.ts` | Index service layer, blast radius, chunk RAG, architecture, re-index (SQLite) |
| `search/db/queries-import-graph.spec.ts` | Diamond graph, path prefix, external imports (SQLite) |
| `search/embedding/hybrid-search.scenarios.spec.ts` | RRF fusion + hash embedding similarity (no SQLite) |
| `desktop/src/active-editor-main.spec.ts` | Tool arg defaults from open editor |
| `desktop/src/local-tool-executor.spec.ts` | `local_import_blast_radius` IPC → sidecar |
| `backend/.../chat-runtime-context.appendix.spec.ts` | Active project + editor appendix snapshot |

Shared in-memory DB helper: `search/__tests__/test-db.ts` (loads all three SQL schemas). SQLite scenario suites **skip** when `better-sqlite3` native bindings do not match the current Node ABI — run `npm rebuild better-sqlite3` from `client/` after Node upgrades.

Run:

```bash
cd client/desktop-server && npm test -- --testPathPattern="code-intelligence|queries-import-graph"
cd client/desktop && npm test -- active-editor-main
cd backend && npm test -- chat-runtime-context.appendix
```

## Related docs

- `client/desktop/README.md` — dev setup, mini-server ports, indexing toggles
- `backend/docs/ARCHITECTURE.md` — gateway and Postgres layout
