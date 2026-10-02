export type Platform = "macos" | "windows" | "linux";

export interface PlatformEntry {
  readonly id: Platform;
  readonly label: string;
  readonly href: string;
  readonly comingSoon?: boolean;
}

export const PLATFORMS: readonly PlatformEntry[] = [
  { id: "macos", label: "macOS", href: "/api/download/macos", comingSoon: true },
  { id: "windows", label: "Windows", href: "/api/download/windows" },
  { id: "linux", label: "Linux", href: "/api/download/linux" },
];

/** Accepts any string so callers can pass the detector's result without casting. */
export function findPlatform(value: string): PlatformEntry | undefined {
  return PLATFORMS.find((platform) => platform.id === value);
}

/**
 * Server-side best guess so the first paint already has the right button (no label swap).
 * Mobile and ChromeOS return null: there is no desktop build for them.
 * The client re-checks with detectDesktopOS() after mount and wins on disagreement.
 */
export function platformFromUserAgent(userAgent: string): Platform | null {
  if (/Android|iPhone|iPad|iPod|CrOS/i.test(userAgent)) return null;
  if (/Windows NT/i.test(userAgent)) return "windows";
  if (/Macintosh|Mac OS X/i.test(userAgent)) return "macos";
  if (/Linux|X11/i.test(userAgent)) return "linux";
  return null;
}
