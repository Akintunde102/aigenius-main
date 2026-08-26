'use strict';

const fs = require('fs');
const path = require('path');

const desktopRoot = path.resolve(__dirname, '..');
const releaseDir = path.join(desktopRoot, 'release');
const frontendRoot = path.join(desktopRoot, '..', 'frontend');
const downloadsDir = path.join(frontendRoot, 'public', 'downloads');
const manifestPath = path.join(frontendRoot, 'src', 'lib', 'desktop-download.manifest.json');

const pkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf8'));
const productName = (pkg.build?.productName || 'AIGenius').replace(/\s+/g, '');
const version = pkg.version || '0.0.0';
const expectedName = `${productName}-${version}-arm64.dmg`;

function findMacDmg() {
  const explicit = path.join(releaseDir, expectedName);
  if (fs.existsSync(explicit)) {
    return explicit;
  }

  if (!fs.existsSync(releaseDir)) {
    return null;
  }

  const dmgs = fs.readdirSync(releaseDir)
    .filter((name) => name.endsWith('.dmg') && name.includes('arm64'))
    .map((name) => ({
      name,
      fullPath: path.join(releaseDir, name),
      mtime: fs.statSync(path.join(releaseDir, name)).mtimeMs,
    }))
    .sort((a, b) => b.mtime - a.mtime);

  return dmgs[0]?.fullPath ?? null;
}

const sourceDmg = findMacDmg();
if (!sourceDmg) {
  console.error(
    `[sync-desktop-download] No macOS DMG found in ${releaseDir}.\n`
      + `  Run: cd client/desktop && npm run package:mac:lite`,
  );
  process.exit(1);
}

const filename = path.basename(sourceDmg);
fs.mkdirSync(downloadsDir, { recursive: true });

const destDmg = path.join(downloadsDir, filename);
fs.copyFileSync(sourceDmg, destDmg);

const manifest = {
  macDmg: filename,
  version,
  href: `/downloads/${filename}`,
  updatedAt: new Date().toISOString(),
};

fs.writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);

console.info(`[sync-desktop-download] ${sourceDmg} → ${destDmg}`);
console.info(`[sync-desktop-download] manifest → ${manifestPath}`);
console.info(
  '[sync-desktop-download] For production (Vercel): upload the DMG to a public CDN '
    + 'and set NEXT_PUBLIC_MAC_DESKTOP_DOWNLOAD_URL to that URL — the DMG is not committed to git.',
);
