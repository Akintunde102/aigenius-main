import fs from 'fs';
import path from 'path';
import { DESKTOP_APP_USER_MODEL_ID } from './desktop-app-identity';
import { listWindowIconCandidates, WINDOW_ICON_ICO, WINDOW_ICON_PNG } from './window-icon-paths';

describe('listWindowIconCandidates', () => {
  const desktopRoot = path.join('C:', 'app', 'desktop');
  const repoRoot = path.join('C:', 'app');

  it('prefers extraResources icons when packaged so nativeImage is not limited to asar', () => {
    const candidates = listWindowIconCandidates({
      isPackaged: true,
      desktopRoot,
      repoRoot,
      resourcesPath: path.join('C:', 'AIGenius', 'resources'),
      exeDir: path.join('C:', 'AIGenius'),
    });

    expect(candidates[0]).toBe(path.join('C:', 'AIGenius', 'resources', WINDOW_ICON_ICO));
    expect(candidates[1]).toBe(path.join('C:', 'AIGenius', 'resources', WINDOW_ICON_PNG));
    expect(candidates).not.toContain(path.join(repoRoot, 'frontend', 'public', 'logo.png'));
  });

  it('uses desktop/build then repo brand assets when unpackaged', () => {
    const candidates = listWindowIconCandidates({
      isPackaged: false,
      desktopRoot,
      repoRoot,
    });

    expect(candidates[0]).toBe(path.join(desktopRoot, 'build', WINDOW_ICON_ICO));
    expect(candidates[1]).toBe(path.join(desktopRoot, 'build', WINDOW_ICON_PNG));
    expect(candidates).toContain(path.join(repoRoot, 'frontend', 'public', 'favicon.ico'));
  });
});

describe('desktop Windows identity', () => {
  it('keeps AppUserModelId aligned with electron-builder appId', () => {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
      build?: { appId?: string; win?: { signAndEditExecutable?: boolean } };
    };
    expect(pkg.build?.appId).toBe(DESKTOP_APP_USER_MODEL_ID);
  });

  it('stamps the Windows exe icon after pack without winCodeSign', () => {
    const pkgPath = path.join(__dirname, '..', 'package.json');
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8')) as {
      build?: { afterPack?: string; win?: { signAndEditExecutable?: boolean } };
    };
    expect(pkg.build?.afterPack).toContain('after-pack-embed-win-icon');
    expect(pkg.build?.win?.signAndEditExecutable).toBe(false);
  });
});
