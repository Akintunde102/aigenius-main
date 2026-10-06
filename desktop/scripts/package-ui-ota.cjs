'use strict';

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { spawnSync } = require('child_process');

const desktopRoot = path.resolve(__dirname, '..');
const repoRoot = path.resolve(desktopRoot, '..');

// 1. Resolve versions
const desktopPkg = JSON.parse(fs.readFileSync(path.join(desktopRoot, 'package.json'), 'utf-8'));
let uiVersion = desktopPkg.version;

const rendererPkgPath = path.join(repoRoot, 'desktop-renderer', 'package.json');
if (fs.existsSync(rendererPkgPath)) {
  const rendererPkg = JSON.parse(fs.readFileSync(rendererPkgPath, 'utf-8'));
  if (rendererPkg.version) {
    uiVersion = rendererPkg.version;
  }
}

// Parse command line args: --min-desktop-version <v> --bundle-url <url>
const args = process.argv.slice(2);
let minDesktopVersion = '1.0.0';

const defaultCdnBase =
  process.env.CLOUDFLARE_CDN_URL ||
  process.env.AIGENIUS_UI_OTA_CDN_URL ||
  'https://downloads.noboxlabs.xyz/desktop/ui';
let bundleUrl = `${defaultCdnBase}/ui-${uiVersion}.zip`;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--min-desktop-version' && args[i + 1]) {
    minDesktopVersion = args[i + 1];
    i++;
  } else if (args[i] === '--bundle-url' && args[i + 1]) {
    bundleUrl = args[i + 1];
    i++;
  }
}

console.info(`[package-ui-ota] Packaging UI OTA release:`);
console.info(`  UI Version:          ${uiVersion}`);
console.info(`  Min Desktop Shell:   ${minDesktopVersion}`);
console.info(`  Target Bundle URL:   ${bundleUrl}`);

// 2. Build the desktop UI
console.info('[package-ui-ota] Building desktop UI...');
const buildScript = path.join(__dirname, 'build-desktop-ui.cjs');
const buildResult = spawnSync(process.execPath, [buildScript], {
  cwd: desktopRoot,
  stdio: 'inherit',
});

if (buildResult.status !== 0) {
  console.error('[package-ui-ota] UI build failed with exit code', buildResult.status);
  process.exit(buildResult.status ?? 1);
}

// 3. Locate build output directory
const distDir = path.join(repoRoot, 'desktop-renderer', 'dist');
if (!fs.existsSync(distDir) || !fs.existsSync(path.join(distDir, 'index.html'))) {
  console.error('[package-ui-ota] Build output not found or missing index.html at:', distDir);
  process.exit(1);
}

// 4. Output directory for OTA artifacts
const otaOutDir = path.join(desktopRoot, 'dist-ota');
if (!fs.existsSync(otaOutDir)) {
  fs.mkdirSync(otaOutDir, { recursive: true });
}

const zipFileName = `ui-${uiVersion}.zip`;
const zipFilePath = path.join(otaOutDir, zipFileName);

if (fs.existsSync(zipFilePath)) {
  fs.unlinkSync(zipFilePath);
}

console.info(`[package-ui-ota] Archiving UI bundle to ${zipFilePath}...`);

let zipSuccess = false;

// Attempt 1: bsdtar / tar -a -cf
try {
  const tarRes = spawnSync('tar', ['-a', '-cf', zipFilePath, '.'], {
    cwd: distDir,
    windowsHide: true,
    stdio: 'pipe',
  });
  if (tarRes.status === 0 && fs.existsSync(zipFilePath)) {
    zipSuccess = true;
  }
} catch {
  /* Fallback */
}

// Attempt 2: PowerShell Compress-Archive (Windows fallback)
if (!zipSuccess && process.platform === 'win32') {
  const psCmd = `Compress-Archive -Path '${path.join(distDir, '*')}' -DestinationPath '${zipFilePath}' -Force`;
  const psRes = spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', psCmd], {
    windowsHide: true,
    stdio: 'pipe',
  });
  if (psRes.status === 0 && fs.existsSync(zipFilePath)) {
    zipSuccess = true;
  }
}

if (!zipSuccess) {
  console.error('[package-ui-ota] Failed to create zip archive of UI bundle');
  process.exit(1);
}

// 5. Calculate SHA-256
const zipBuffer = fs.readFileSync(zipFilePath);
const sha256 = crypto.createHash('sha256').update(zipBuffer).digest('hex');
const sizeKb = (zipBuffer.length / 1024).toFixed(1);

console.info(`[package-ui-ota] Created ${zipFileName} (${sizeKb} KB)`);
console.info(`  SHA-256: ${sha256}`);

// 6. Write manifest
const manifest = {
  uiVersion,
  minDesktopVersion,
  bundleUrl,
  sha256,
  fileSize: zipBuffer.length,
  createdAt: new Date().toISOString(),
};

const manifestPath = path.join(otaOutDir, 'ui-manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf-8');

console.info(`[package-ui-ota] Manifest written to ${manifestPath}`);
console.info('\nOTA packaging complete! Ready for CDN upload.');
