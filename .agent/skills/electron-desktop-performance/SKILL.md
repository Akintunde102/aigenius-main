---
name: electron-desktop-performance
description: >-
  Electron main/renderer performance for long-lived desktop apps: startup, non-blocking I/O,
  IPC patterns, memory and listener hygiene, perceived performance, and measurement. Use for
  desktop/ (Electron) and frontend code paths that run in the AIGenius shell.
allowed-tools: Read, Grep, Glob, Bash, Edit, Write
---

# Electron & desktop renderer performance

**Primary reference:** [Building High-Performance Electron Apps — Johnny Le](https://www.johnnyle.io/read/electron-performance) (June 2025). Official depth: [Electron performance](https://www.electronjs.org/docs/latest/tutorial/performance) (Electron docs).

Apply these principles when changing `desktop/` (main, preload, utilities) or the Next.js renderer when it loads inside the Electron shell (see `frontend/src/lib/utils/desktop-runtime.ts`).

---

## 1. Optimize startup

- Defer work that is not needed for the first frame or first interaction; avoid loading large data eagerly at startup.
- Keep the **initial JS payload small**: route/component code splitting, dynamic `import()` for heavy modules, tree shaking, drop unnecessary polyfills in controlled Chromium builds.
- Treat the embedded browser as **owned**: enable modern build targets where safe; keep the Electron/Chromium stack updated for security and engine wins.

---

## 2. Do not block (main or renderer)

- **Async is not automatic non-blocking**: avoid long synchronous CPU work on the main thread (large sync loops, huge JSON parse/stringify on hot paths, synchronous crypto on big inputs without chunking).
- Prefer **async I/O** (`fs.promises`, streams) and break up CPU work (batching, `setImmediate`/`queueMicrotask`, workers, or Electron **utility processes** when isolation is required).
- **IPC:** avoid `sendSync` / synchronous IPC from the renderer when an async `invoke`/`handle` pattern can be used—sync IPC stalls the renderer until the main process answers.
- Understand the **event loop** for both Node (main) and the renderer; profile when in doubt.

---

## 3. Use more than JavaScript when it matters

- Hot paths (indexing, parsing megabytes, crypto) may belong in **native addons**, **Rust**, or **WebAssembly**, with clear boundaries and error handling—do not block the JS thread while native work runs inline without yielding.

---

## 4. Treat the app as long-lived

- Desktop users often leave the app open: **leaks accumulate** (listeners, timers, `ipcMain`/`ipcRenderer` subscriptions, maps/caches, native handles).
- **Clean up** in paired subscribe/unsubscribe patterns (`useEffect` return, `BrowserWindow` `closed`, `before-quit`).
- Reduce background work when the window is **blurred** or the machine is **suspended**; use `requestIdleCallback` (renderer) or idle scheduling in main for non-urgent work.
- Prune or expire **caches**; avoid unbounded growth of in-memory stores.

---

## 5. Perceived performance

- Prefer **optimistic UI** and clear loading/disabled states so the UI does not feel frozen.
- Where product requirements allow, **local-first or pre-warmed** data (IndexedDB, sqlite, small persisted caches) improves repeat launches; scope this to privacy and sync rules.
- Use React **`startTransition` / `useTransition`** for non-urgent updates that should not block typing or primary interactions.

---

## 6. Measure

- Track **time-to-interactive** perception, **memory**, **CPU**, **rerenders**, **FPS**, and **IPC latency**—not only raw JS time.
- Use **Chrome DevTools** (renderer), **Node/Electron profiling** (main), **React DevTools**, and **Electron `contentTracing`** when investigating regressions.
- **Profile before optimizing**; fix the measured bottleneck.

---

## Repo touchpoints

- **Desktop:** `desktop/src/main.ts`, preload, IPC handlers—keep main-process work off the critical path where possible; document new IPC as async unless a hard sync contract is unavoidable.
- **Renderer:** `isAigeniusDesktopRuntime()` / `desktop-runtime.ts`—features that only run in Electron should still avoid blocking patterns and unbounded listeners.

---

## Anti-patterns (avoid)

| Avoid | Prefer |
|-------|--------|
| Sync file/network reads on startup | Lazy load; async APIs |
| `ipcRenderer.sendSync` for normal requests | `invoke` / `handle` async IPC |
| Listeners without removal | Store handler ref; remove on teardown |
| Huge main-bundle imports for rarely used UI | Dynamic import / route split |
| Unbounded caches | TTL, size caps, LRU where appropriate |
