import path from 'path';
import { pathToFileURL } from 'url';
import { app } from 'electron';

export type ReadPdfDocumentResult = {
  text: string;
  method: 'text' | 'ocr';
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
  return path.join(__dirname, 'models');
}

type ReadPdfModule = {
  readPdfText: (options: { filePath: string; modelsDir: string }) => Promise<{
    content: string;
    method: 'text' | 'ocr';
  }>;
};

const importEsModule = new Function(
  'specifier',
  'return import(specifier)',
) as (specifier: string) => Promise<ReadPdfModule>;

async function loadReadPdfModule(): Promise<ReadPdfModule> {
  const modPath = path.join(desktopServerDistDir(), 'search', 'pdf-text-extract.js');
  return importEsModule(pathToFileURL(modPath).href);
}

/** Extract PDF text (embedded layer + OCR fallback for scanned pages). */
export async function readPdfDocumentText(filePath: string): Promise<ReadPdfDocumentResult> {
  const { readPdfText } = await loadReadPdfModule();
  const result = await readPdfText({ filePath, modelsDir: resolveModelsDir() });
  return { text: result.content, method: result.method };
}
