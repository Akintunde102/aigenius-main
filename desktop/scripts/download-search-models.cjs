#!/usr/bin/env node
// @ts-check
'use strict';

/**
 * Downloads YOLOv8 nano ONNX model and Tesseract English traineddata
 * into desktop/src/models/ if not already present.
 *
 * Usage:
 *   node scripts/download-search-models.cjs
 *
 * Add to package.json scripts:
 *   "download-models": "node scripts/download-search-models.cjs"
 */

const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');

const MODELS_DIR = path.join(__dirname, '..', 'src', 'models');

const MODELS = [
  {
    name: 'yolox_nano.onnx',
    url: 'https://huggingface.co/hr16/yolox-onnx/resolve/main/yolox_nano.onnx?download=true',
    sizeMb: 4,
  },
  {
    name: 'eng.traineddata',
    url: 'https://github.com/tesseract-ocr/tessdata/raw/main/eng.traineddata',
    sizeMb: 25,
  },
];

fs.mkdirSync(MODELS_DIR, { recursive: true });

function download(url, dest) {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      console.log(`  ✓ Already present: ${path.basename(dest)}`);
      return resolve();
    }

    const file = fs.createWriteStream(dest);
    const get = url.startsWith('https') ? https : http;

    const req = get.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return download(res.headers.location, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }

      const total = parseInt(res.headers['content-length'] || '0', 10);
      let received = 0;
      let lastPct = -1;

      res.on('data', (chunk) => {
        received += chunk.length;
        if (total > 0) {
          const pct = Math.floor((received / total) * 100);
          if (pct !== lastPct && pct % 10 === 0) {
            process.stdout.write(`\r  Downloading ${path.basename(dest)}: ${pct}%`);
            lastPct = pct;
          }
        }
      });

      res.pipe(file);
      file.on('finish', () => {
        file.close();
        process.stdout.write('\n');
        resolve();
      });
    });

    req.on('error', (err) => {
      file.close();
      try { fs.unlinkSync(dest); } catch { /* ignore */ }
      reject(err);
    });
  });
}

async function main() {
  console.log('[download-search-models] Target dir:', MODELS_DIR);
  for (const model of MODELS) {
    const dest = path.join(MODELS_DIR, model.name);
    console.log(`\nDownloading ${model.name} (~${model.sizeMb} MB)...`);
    try {
      await download(model.url, dest);
    } catch (err) {
      console.error(`  ✗ Failed:`, err.message);
      console.error(
        `    You can manually download it from:\n    ${model.url}\n    → ${dest}`,
      );
    }
  }
  console.log('\n[download-search-models] Done.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
