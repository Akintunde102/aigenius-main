'use strict';

/**
 * Build a downloadable voice-pack archive (Python venv for TTS/STT sidecar).
 *
 * Output: desktop/dist-artifacts/voice-pack-<platform>-<arch>.tar.gz
 * Archive layout extracts to: voice-pack/python-venv/...
 */
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const desktopRoot = path.resolve(__dirname, '..');
const serverRoot = path.resolve(desktopRoot, '..', 'desktop-server');
const platform = (process.env.AIGENIUS_PACKAGE_PLATFORM || process.platform).trim();
const arch = (process.env.AIGENIUS_PACKAGE_ARCH || process.arch).trim();
const venvSrc = path.join(serverRoot, 'pack-deps', `python-venv-${platform}-${arch}`);
const outDir = path.join(desktopRoot, 'dist-artifacts');
const stagingDir = path.join(outDir, 'voice-pack-staging');
const archivePath = path.join(outDir, `voice-pack-${platform}-${arch}.tar.gz`);

if (!fs.existsSync(venvSrc)) {
  console.error(`build-voice-pack: missing ${venvSrc}. Run: npm run install:python-venv`);
  process.exit(1);
}

fs.rmSync(stagingDir, { recursive: true, force: true });
fs.mkdirSync(stagingDir, { recursive: true });
fs.cpSync(venvSrc, path.join(stagingDir, 'python-venv'), { recursive: true });

fs.mkdirSync(outDir, { recursive: true });
execSync(`tar -czf "${archivePath}" -C "${stagingDir}" python-venv`, { stdio: 'inherit' });
fs.rmSync(stagingDir, { recursive: true, force: true });

console.info(`[build-voice-pack] Wrote ${archivePath}`);
