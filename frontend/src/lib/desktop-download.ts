import manifest from './desktop-download.manifest.json';

export type DesktopDownloadManifest = {
  macDmg: string;
  version: string;
  href: string;
  updatedAt: string;
};

/**
 * Local dev: `/downloads/*.dmg` from `npm run sync:web-download`.
 * Production: set `NEXT_PUBLIC_MAC_DESKTOP_DOWNLOAD_URL` to a public CDN URL (DMG is gitignored).
 */
const externalMacDownloadUrl = process.env.NEXT_PUBLIC_MAC_DESKTOP_DOWNLOAD_URL?.trim();

export const macDesktopDownload: DesktopDownloadManifest = {
  ...(manifest as DesktopDownloadManifest),
  href: externalMacDownloadUrl || (manifest as DesktopDownloadManifest).href,
};
