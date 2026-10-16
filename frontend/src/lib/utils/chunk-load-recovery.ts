import { reloadPage } from "@/lib/utils/navigate";

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
 * Render a self-contained, critical loading overlay during the reload transition so the
 * user never experiences an unstyled or flickering screen while the browser updates bundles.
 */
function showUpdatingOverlay(): void {
  try {
    if (typeof document === "undefined") return;
    if (document.getElementById("aig-update-overlay")) return;
    const overlay = document.createElement("div");
    overlay.id = "aig-update-overlay";
    overlay.setAttribute(
      "style",
      "position:fixed;inset:0;z-index:999999;display:flex;flex-direction:column;align-items:center;justify-content:center;background:#0b0b0e;color:#e8eaef;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;padding:24px;text-align:center;box-sizing:border-box;",
    );
    overlay.innerHTML = `
      <style>@keyframes aig-reload-spin{to{transform:rotate(360deg)}}</style>
      <div style="width:36px;height:36px;border:3px solid rgba(14,165,233,0.25);border-top-color:#0284c7;border-radius:50%;animation:aig-reload-spin 0.85s linear infinite;margin-bottom:16px;box-sizing:border-box;"></div>
      <div style="font-size:16px;font-weight:600;margin-bottom:6px;color:#f8fafc;">Updating workspace…</div>
      <div style="font-size:13px;color:#94a3b8;max-width:320px;line-height:1.5;">Refreshing to the latest version.</div>
    `;
    if (document.body) {
      document.body.appendChild(overlay);
    } else if (document.documentElement) {
      document.documentElement.appendChild(overlay);
    }
  } catch {
    /* ignore fallback errors */
  }
}

/**
 * One automatic hard reload per tab session when a lazy route chunk 404s (common on Windows dev).
 * Returns true if a reload was triggered.
 */
export function tryAutoReloadOnChunkLoadError(err: unknown): boolean {
  if (typeof window === "undefined" || !isChunkLoadError(err)) {
    return false;
  }
  
  // If the browser is explicitly offline, a reload will just fail entirely (blank screen).
  // Let the ErrorBoundary render the fallback UI instead so the user can manually retry when online.
  if (typeof navigator !== "undefined" && !navigator.onLine) {
    return false;
  }

  if (sessionStorage.getItem(CHUNK_RELOAD_KEY) === "1") {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
    return false;
  }
  sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
  showUpdatingOverlay();
  reloadPage();
  return true;
}

export function clearChunkReloadGuard(): void {
  if (typeof window !== "undefined") {
    sessionStorage.removeItem(CHUNK_RELOAD_KEY);
  }
}
