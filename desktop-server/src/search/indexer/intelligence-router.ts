import path from 'path';
import {
  type FileIntelligence,
  isGeneratedPath,
  languageForExtension,
} from './language-indexer.js';
import { indexTypeScript, isTypeScriptExtension } from './ts-morph-indexer.js';
import { indexPython } from './python-indexer.js';
import { indexRust } from './rust-indexer.js';
import { indexCpp, isCppExtension } from './cpp-indexer.js';
import { indexMakefile, isMakefile } from './makefile-indexer.js';
import { parseSymbolsAsync } from './symbol-parser.js';

/**
 * Route a file to the correct language map-drawer.
 */
export async function indexFileIntelligence(
  filePath: string,
  content: string,
  extension: string,
): Promise<FileIntelligence> {
  const ext = extension.toLowerCase().replace(/^\./, '');
  const generated = isGeneratedPath(filePath);

  if (isMakefile(filePath, ext)) {
    const result = indexMakefile(filePath, content);
    return { ...result, isGenerated: generated };
  }

  if (isTypeScriptExtension(ext)) {
    try {
      const result = indexTypeScript(filePath, content);
      return { ...result, isGenerated: generated };
    } catch (err) {
      console.warn('[search] ts-morph indexer failed, falling back to regex:', filePath, err);
    }
  }

  if (ext === 'py') {
    const result = await indexPython(filePath, content);
    return { ...result, isGenerated: generated };
  }

  if (ext === 'rs') {
    const result = await indexRust(filePath, content);
    return { ...result, isGenerated: generated };
  }

  if (isCppExtension(ext)) {
    const result = await indexCpp(filePath, content, ext);
    return { ...result, isGenerated: generated };
  }

  const symbols = (await parseSymbolsAsync(content, ext)).map((s) => ({
    ...s,
    confidence: 'heuristic' as const,
  }));

  return {
    language: languageForExtension(ext),
    symbols,
    edges: [],
    isGenerated: generated,
  };
}
