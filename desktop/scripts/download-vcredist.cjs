'use strict';

/**
 * Downloads the Microsoft Visual C++ Redistributable (x64) so it can be bundled into the
 * Windows NSIS installer and silently self-installed on machines that lack it.
 *
 * Native modules used by the mini-server (better-sqlite3, sharp, onnxruntime-node) require this
 * runtime. Without it the mini-server process crashes on startup with no visible error beyond
 * "Timeout waiting for http://127.0.0.1:8001/health" — the exact symptom users cannot self-diagnose.
 *
 * Cached under build/vcredist/ (gitignored) so repeat builds don't re-download.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');

const arch = (process.argv[2] || 'x64').trim();
const url = `https://aka.ms/vs/17/release/vc_redist.${arch}.exe`;
const dest = path.join(__dirname, '..', 'build', 'vcredist', `vc_redist.${arch}.exe`);
const MIN_EXPECTED_BYTES = 10_000_000; // real installer is ~25MB; guard against partial/error pages

function download(fromUrl, redirectsLeft = 5) {
  return new Promise((resolve, reject) => {
    https
      .get(fromUrl, (res) => {
        if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
          res.resume();
          if (redirectsLeft <= 0) {
            reject(new Error('Too many redirects while downloading vc_redist'));
            return;
          }
          download(res.headers.location, redirectsLeft - 1).then(resolve, reject);
          return;
        }
        if (res.statusCode !== 200) {
          res.resume();
          reject(new Error(`Failed to download vc_redist: HTTP ${res.statusCode}`));
          return;
        }
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        const tmpDest = `${dest}.download`;
        const file = fs.createWriteStream(tmpDest);
        res.pipe(file);
        file.on('finish', () => {
          file.close(() => {
            fs.renameSync(tmpDest, dest);
            resolve();
          });
        });
        file.on('error', reject);
      })
      .on('error', reject);
  });
}

async function main() {
  if (fs.existsSync(dest) && fs.statSync(dest).size > MIN_EXPECTED_BYTES) {
    console.info(`[download-vcredist] Using cached ${dest}`);
    return;
  }

  console.info(`[download-vcredist] Downloading Visual C++ Redistributable (${arch})...`);
  await download(url);

  const size = fs.statSync(dest).size;
  if (size < MIN_EXPECTED_BYTES) {
    fs.rmSync(dest, { force: true });
    throw new Error(`Downloaded vc_redist.${arch}.exe looks too small (${size} bytes) — aborting`);
  }
  console.info(`[download-vcredist] Saved ${dest} (${(size / 1024 / 1024).toFixed(1)} MB)`);
}

main().catch((err) => {
  console.error('[download-vcredist] Failed:', err);
  process.exit(1);
});
