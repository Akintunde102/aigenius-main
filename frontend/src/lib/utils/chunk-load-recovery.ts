const CHUNK_RELOAD_KEY = "aigenius.chunk-reload";

export function isChunkLoadError(err: unknown): boolean {
  if (err == null || typeof err !== "object") {
    return false;
  }
  const name =
    "name" in err && typeof (err as { name: unknown }).name === "string"
      ? (err as { name: string }).name
      : "";
  const message =
    "message" in err && typeof (err as { message: unknown }).message === "string"
      ? (err as { message: string }).message
      : String(err);
  return name === "ChunkLoadError" || /Loading chunk .* failed/i.test(message);
}

/**
 * One automatic hard reload per tab session when a lazy route chunk 404s (common on Windows dev).
 * Returns true if a reload was triggered.
 */
export function tryAutoReloadOnChunkLoadError(err: unknown): boolean {
  if (typeof window === "undefined" || !isChunkLoadError(err)) {
    return false;
  }
  if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1") {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    return false;
  }
  sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  window.location.reload();
  return true;
}

export function clearChunkReloadGuard(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  }
}
