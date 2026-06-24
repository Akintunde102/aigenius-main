import path from 'path';
import { extractText } from './text-extractor.js';
import { extractPdf } from './pdf-extractor.js';
import { extractDocx } from './docx-extractor.js';
import { extractOcr } from './ocr-extractor.js';
import { tagImage } from './yolo-tagger.js';

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'mdx', 'markdown', 'rst', 'csv', 'json', 'jsonl',
  'yaml', 'yml', 'toml', 'ini', 'conf', 'env',
  'ts', 'tsx', 'js', 'jsx', 'mjs', 'cjs',
  'py', 'rb', 'go', 'rs', 'java', 'kt', 'swift', 'c', 'cpp', 'h', 'hpp', 'cs',
  'html', 'htm', 'css', 'scss', 'less', 'xml', 'svg',
  'sh', 'bash', 'zsh', 'fish', 'bat', 'ps1',
  'sql', 'graphql', 'proto',
]);

const IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'bmp', 'tiff', 'tif']);

export interface ExtractionResult {
  content: string;
  tags: string[];
  error?: string;
}

/**
 * Routes a file to the correct extractor based on its extension.
 * Gracefully returns an empty result for unknown/binary files.
 */
export async function routeExtraction(
  filePath: string,
  modelsDir: string,
  skipImages = false,
): Promise<ExtractionResult> {
  const ext = path.extname(filePath).toLowerCase().replace(/^\./, '');

  try {
    if (TEXT_EXTENSIONS.has(ext)) {
      return await extractText(filePath);
    }

    if (ext === 'pdf') {
      return await extractPdf(filePath);
    }

    if (ext === 'docx') {
      return await extractDocx(filePath);
    }

    if (IMAGE_EXTENSIONS.has(ext)) {

      console.log('[search] Processing image:', filePath);
      console.log('[search] skipImages:', skipImages);

      if (skipImages) return { content: '', tags: ['image'] };
      const [ocrResult, yoloResult] = await Promise.allSettled([
        extractOcr(filePath, modelsDir),
        tagImage(filePath, modelsDir),
      ]);

      console.log('[search] ocrResult:', ocrResult);
      console.log('[search] yoloResult:', yoloResult);

      const content = ocrResult.status === 'fulfilled' ? ocrResult.value.content : '';
      const ocrTags = ocrResult.status === 'fulfilled' ? ocrResult.value.tags : [];
      const yoloTags = yoloResult.status === 'fulfilled' ? yoloResult.value : [];

      const errorStr = [];
      if (ocrResult.status === 'rejected') errorStr.push(`OCR: ${ocrResult.reason instanceof Error ? ocrResult.reason.message : String(ocrResult.reason)}`);
      if (yoloResult.status === 'rejected') errorStr.push(`YOLO: ${yoloResult.reason instanceof Error ? yoloResult.reason.message : String(yoloResult.reason)}`);

      console.log({ ocrContent: content, ocrTags, yoloTags });

      return {
        content,
        tags: [...new Set(['image', ...ocrTags, ...yoloTags])],
        ...(errorStr.length > 0 ? { error: errorStr.join(' | ') } : {})
      };
    }

    // Unknown / binary — skip
    return { content: '', tags: [] };
  } catch (err) {
    return {
      content: '',
      tags: [],
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
