import https from 'https';
import http from 'http';
import fs from 'fs';
import path from 'path';

const PADDLE_BASE = 'https://media.githubusercontent.com/media/PT-Perkasa-Pilar-Utama/ppu-paddle-ocr-models/main';
const PADDLE_DICT_BASE = 'https://raw.githubusercontent.com/PT-Perkasa-Pilar-Utama/ppu-paddle-ocr-models/main';

const MODELS = [
  {
    name: 'yolox_nano.onnx',
    url: 'https://huggingface.co/hr16/yolox-onnx/resolve/main/yolox_nano.onnx?download=true',
    sizeMb: 4,
  },
  {
    name: 'PP-OCRv6_small_det.ort',
    url: `${PADDLE_BASE}/detection/ort/PP-OCRv6_small_det.ort`,
    sizeMb: 5,
  },
  {
    name: 'PP-OCRv6_small_rec.ort',
    url: `${PADDLE_BASE}/recognition/ort/PP-OCRv6_small_rec.ort`,
    sizeMb: 22,
  },
  {
    name: 'ppocrv6_dict.txt',
    url: `${PADDLE_DICT_BASE}/recognition/ppocrv6_dict.txt`,
    sizeMb: 1,
  },
];

function download(url: string, dest: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (fs.existsSync(dest)) {
      return resolve();
    }

    const file = fs.createWriteStream(dest);
    const get = url.startsWith('https') ? https : http;

    const req = get.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        file.close();
        fs.unlinkSync(dest);
        return download(res.headers.location!, dest).then(resolve, reject);
      }
      if (res.statusCode !== 200) {
        file.close();
        fs.unlinkSync(dest);
        return reject(new Error(`HTTP ${res.statusCode} for ${url}`));
      }

      res.pipe(file);
      file.on('finish', () => {
        file.close();
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

export async function ensureModelsDownloaded(modelsDir: string): Promise<void> {
  if (!fs.existsSync(modelsDir)) {
    fs.mkdirSync(modelsDir, { recursive: true });
  }

  const downloads = MODELS.map(async (model) => {
    const dest = path.join(modelsDir, model.name);
    if (!fs.existsSync(dest)) {
      console.log(`[models-downloader] Downloading missing model: ${model.name}...`);
      await download(model.url, dest);
    }
  });

  await Promise.all(downloads);
}
