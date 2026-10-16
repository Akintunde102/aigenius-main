import fs from 'fs';
import path from 'path';

const dictDir = path.join(process.cwd(), 'src/locales/dictionaries');
const outPath = path.join(process.cwd(), 'src/locales/dictionary-module-loaders.ts');

const files = fs.readdirSync(dictDir).filter((f) => f.endsWith('.ts') && f !== 'en.ts').sort();

const aliasEntries = [
  "  'zh-cn': 'zh'",
  "  'zh-hk': 'zh-tw'",
  "  'pt-pt': 'pt'",
  "  'es-es': 'es'",
  "  'es-mx': 'es'",
  "  'fr-fr': 'fr'",
  "  'fr-ca': 'fr'",
  "  'en-us': 'en'",
  "  'en-gb': 'en'",
  "  'en-ca': 'en'",
  "  'en-au': 'en'",
  "  'nb-no': 'no'",
  "  'nn-no': 'no'",
  "  'sr-latn-rs': 'sr-latn'",
  "  'sr-cyrl-rs': 'sr-cyrl'",
  "  'bs-latn-ba': 'bs'",
  "  'uz-latn-uz': 'uz'",
  "  'az-latn-az': 'az'",
  "  'chr-cher-us': 'chr'",
  "  'iu-cans': 'iu'",
  "  'quc-latn': 'quc'",
  "  'ha-latn-ng': 'ha'",
  "  'yo-latn-ng': 'yo'",
  "  'ig-latn-ng': 'ig'",
  "  'am-et': 'am'",
];

const loaderLines = [];
for (const file of files) {
  const stem = file.replace(/\.ts$/, '');
  const content = fs.readFileSync(path.join(dictDir, file), 'utf8');
  const m = content.match(/export const (\w+)/);
  const exportName = m ? m[1] : stem;
  loaderLines.push(`  '${stem}': () => import('./dictionaries/${stem}').then((m) => m.${exportName}),`);
}

const body = `import { RecursivePartial, TranslationDictionary } from './types';

/** Maps catalog / BCP-47 codes to on-disk dictionary module keys (file stem). */
export const LOCALE_CODE_TO_MODULE_KEY: Record<string, string> = {
${aliasEntries.join(',\n')},
};

export const DICTIONARY_MODULE_LOADERS: Record<
  string,
  () => Promise<RecursivePartial<TranslationDictionary>>
> = {
${loaderLines.join('\n')}
};

export function resolveDictionaryModuleKey(langCode: string): string | null {
  const normalized = langCode.toLowerCase().trim();
  if (!normalized || normalized === 'en' || normalized.startsWith('en-')) {
    return null;
  }
  const alias = LOCALE_CODE_TO_MODULE_KEY[normalized];
  if (alias) {
    return alias === 'en' ? null : alias;
  }
  if (DICTIONARY_MODULE_LOADERS[normalized]) {
    return normalized;
  }
  const base = normalized.split('-')[0];
  if (base && DICTIONARY_MODULE_LOADERS[base]) {
    return base;
  }
  return null;
}
`;

fs.writeFileSync(outPath, body);
console.log('Wrote', outPath, 'with', files.length, 'loaders');
