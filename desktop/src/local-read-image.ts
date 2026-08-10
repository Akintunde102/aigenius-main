import path from 'path';
import { pathToFileURL } from 'url';
import { app } from 'electron';

export type ReadImageAnalysisInput = {
  filePath?: string;
  url?: string;
  preferIndex?: boolean;
  forceLive?: boolean;
};

export type ReadImageAnalysisResult = {
  path: string;
  name: string;
  extension: string;
  url?: string;
  source: 'index' | 'live' | 'url';
  indexed: boolean;
  ocr_text: string;
  tags: string[];
  objects: string[];
  errors: string[];
  content_truncated?: boolean;
};

function desktopServerDistDir(): string {
  if (app.isPackaged) {
    return path.join(process.resourcesPath, 'desktop-server');
  }
  return path.join(__dirname, '..', '..', 'desktop-server', 'dist');
}

function resolveModelsDir(): string {
  const fromEnv = process.env.AIGENIUS_MODELS_DIR?.trim();
  if (fromEnv) return fromEnv;
  const besideDist = path.join(__dirname, 'models');
  return besideDist;
}

type ReadImageModule = {
  readImageAnalysis: (input: {
    filePath?: string;
    url?: string;
    modelsDir: string;
    preferIndex?: boolean;
    forceLive?: boolean;
  }) => Promise<ReadImageAnalysisResult>;
};

/** Real dynamic import — TS downlevels `import()` to `require()` under CommonJS, which breaks ESM. */
const importEsModule = new Function(
  'specifier',
  'return import(specifier)',
) as (specifier: string) => Promise<ReadImageModule>;

async function loadReadImageModule(): Promise<ReadImageModule> {
  const modPath = path.join(desktopServerDistDir(), 'search', 'read-image.js');
  return importEsModule(pathToFileURL(modPath).href);
}

/** Run OCR + object detection in-process (no sidecar HTTP — avoids token/port conflicts). */
export async function runReadImageAnalysis(input: ReadImageAnalysisInput): Promise<ReadImageAnalysisResult> {
  const { readImageAnalysis } = await loadReadImageModule();
  return readImageAnalysis({
    filePath: input.filePath,
    url: input.url,
    modelsDir: resolveModelsDir(),
    preferIndex: input.preferIndex,
    forceLive: input.forceLive,
  });
}
