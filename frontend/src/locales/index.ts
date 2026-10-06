import { LANGUAGE_CATALOG, LANGUAGE_MAP, DEFAULT_LANGUAGE_CODE, resolveLanguageItem, LanguageCatalogItem } from './catalog';
import { TranslationDictionary, RecursivePartial, TranslationKeyPath } from './types';
import { en } from './dictionaries/en';
import { es } from './dictionaries/es';
import { fr } from './dictionaries/fr';
import { de } from './dictionaries/de';
import { zh } from './dictionaries/zh';
import { zhTw } from './dictionaries/zh-tw';
import { ja } from './dictionaries/ja';
import { ko } from './dictionaries/ko';
import { pt } from './dictionaries/pt';
import { ptBr } from './dictionaries/pt-br';
import { it } from './dictionaries/it';
import { ar } from './dictionaries/ar';
import { ru } from './dictionaries/ru';
import { hi } from './dictionaries/hi';
import { nl } from './dictionaries/nl';
import { pl } from './dictionaries/pl';
import { tr } from './dictionaries/tr';
import { sv } from './dictionaries/sv';
import { uk } from './dictionaries/uk';
import { el } from './dictionaries/el';
import { cs } from './dictionaries/cs';
import { da } from './dictionaries/da';
import { fi } from './dictionaries/fi';
import { no } from './dictionaries/no';
import { ro } from './dictionaries/ro';
import { hu } from './dictionaries/hu';
import { vi } from './dictionaries/vi';
import { id } from './dictionaries/id';
import { th } from './dictionaries/th';
import { bn } from './dictionaries/bn';
import { ms } from './dictionaries/ms';
import { fil } from './dictionaries/fil';
import { he } from './dictionaries/he';
import { fa } from './dictionaries/fa';
import { ur } from './dictionaries/ur';
import { sw } from './dictionaries/sw';
import { yo } from './dictionaries/yo';
import { ha } from './dictionaries/ha';
import { ig } from './dictionaries/ig';
import { am } from './dictionaries/am';

export * from './catalog';
export * from './types';

const DICTIONARY_REGISTRY: Record<string, RecursivePartial<TranslationDictionary>> = {
  en,
  es,
  fr,
  de,
  'zh-cn': zh,
  'zh-tw': zhTw,
  zh,
  ja,
  ko,
  'pt-br': ptBr,
  'pt-pt': pt,
  pt,
  it,
  ar,
  ru,
  hi,
  nl,
  pl,
  tr,
  sv,
  uk,
  el,
  cs,
  da,
  fi,
  no,
  ro,
  hu,
  vi,
  id,
  th,
  bn,
  ms,
  fil,
  he,
  fa,
  ur,
  sw,
  yo,
  ha,
  ig,
  am,
};

function deepMergeWithFallback(
  base: Record<string, any>,
  override?: Record<string, any>,
): Record<string, any> {
  if (!override) return base;
  const result: Record<string, any> = { ...base };
  for (const key of Object.keys(base)) {
    const baseVal = base[key];
    const overrideVal = override[key];
    if (
      baseVal &&
      typeof baseVal === 'object' &&
      !Array.isArray(baseVal)
    ) {
      result[key] = deepMergeWithFallback(
        baseVal,
        overrideVal && typeof overrideVal === 'object' ? overrideVal : undefined,
      );
    } else if (typeof overrideVal === 'string' && overrideVal.trim().length > 0) {
      result[key] = overrideVal;
    }
  }
  return result;
}

const resolvedDictionaryCache = new Map<string, TranslationDictionary>();

/** True when this language has its own UI strings. Others still steer the assistant, and the interface stays English. */
export function hasUiDictionary(langCode?: string | null): boolean {
  const item = resolveLanguageItem(langCode);
  const code = item.code.toLowerCase();
  if (code === DEFAULT_LANGUAGE_CODE) return true;
  return Boolean(DICTIONARY_REGISTRY[code] || DICTIONARY_REGISTRY[code.split('-')[0]]);
}

export function getDictionary(langCode?: string | null): TranslationDictionary {
  const item = resolveLanguageItem(langCode);
  const code = item.code.toLowerCase();
  
  const cached = resolvedDictionaryCache.get(code);
  if (cached) return cached;

  if (code === DEFAULT_LANGUAGE_CODE) {
    resolvedDictionaryCache.set(code, en);
    return en;
  }

  const rawOverride = DICTIONARY_REGISTRY[code] || DICTIONARY_REGISTRY[code.split('-')[0]];
  const merged = deepMergeWithFallback(en, rawOverride) as TranslationDictionary;
  resolvedDictionaryCache.set(code, merged);
  return merged;
}

export function translate(
  langCode: string,
  keyPath: TranslationKeyPath | string,
  fallback?: string,
  params?: Record<string, string | number>,
): string {
  const dict = getDictionary(langCode);
  const parts = keyPath.split('.');
  let current: any = dict;

  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      current = undefined;
      break;
    }
  }

  let text = typeof current === 'string' && current.length > 0 ? current : (fallback ?? keyPath);

  if (params && Object.keys(params).length > 0) {
    for (const [k, v] of Object.entries(params)) {
      text = text.replace(new RegExp(`\\{${k}\\}`, 'g'), String(v));
    }
  }

  return text;
}
