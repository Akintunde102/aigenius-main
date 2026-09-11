import path from 'path';

export const WINDOW_ICON_PNG = 'aigenius_icon_final.png';
export const WINDOW_ICON_ICO = 'icon.ico';

export type WindowIconPathInput = {
  isPackaged: boolean;
  /** `client/desktop` (parent of compiled `dist/`). */
  desktopRoot: string;
  resourcesPath?: string;
  exeDir?: string;
  repoRoot: string;
};

/**
 * Ordered icon files for the shell window and Windows taskbar.
 * Packaged builds prefer extraResources (outside asar) so nativeImage can load them.
 */
export function listWindowIconCandidates(input: WindowIconPathInput): string[] {
  const { desktopRoot, repoRoot } = input;
  const buildPng = path.join(desktopRoot, 'build', WINDOW_ICON_PNG);
  const buildIco = path.join(desktopRoot, 'build', WINDOW_ICON_ICO);

  if (input.isPackaged) {
    const fromResources = input.resourcesPath
      ? [
          path.join(input.resourcesPath, WINDOW_ICON_ICO),
          path.join(input.resourcesPath, WINDOW_ICON_PNG),
        ]
      : [];
    const fromExe = input.exeDir
      ? [
          path.join(input.exeDir, WINDOW_ICON_ICO),
          path.join(input.exeDir, WINDOW_ICON_PNG),
        ]
      : [];
    return [...fromResources, buildIco, buildPng, ...fromExe];
  }

  return [
    buildIco,
    buildPng,
    path.join(repoRoot, WINDOW_ICON_PNG),
    path.join(repoRoot, 'frontend', 'public', 'logo.png'),
    path.join(repoRoot, 'frontend', 'public', 'favicon.ico'),
  ];
}
