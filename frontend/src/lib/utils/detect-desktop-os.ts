/**
 * Detect the visitor's desktop operating system from the User-Agent.
 *
 * Returns the detected OS or "unknown" if the UA doesn't match any
 * known desktop platform. Consumers should treat "unknown" as a
 * neutral fallback (show a generic "Download" label, open the
 * platform-picker instead of auto-downloading, etc.).
 */

export type DesktopOS = "macos" | "windows" | "linux" | "unknown";

export function detectDesktopOS(): DesktopOS {
  if (typeof window === "undefined") return "unknown";

  const ua = navigator.userAgent;

  if (/Mac OS X/.test(ua)) return "macos";
  if (/Windows/.test(ua)) return "windows";
  if (/Linux/.test(ua)) return "linux";

  return "unknown";
}

/** Human-readable labels keyed by DesktopOS */
export const OS_LABELS: Record<DesktopOS, string> = {
  macos: "macOS",
  windows: "Windows",
  linux: "Linux",
  unknown: "Desktop",
};
