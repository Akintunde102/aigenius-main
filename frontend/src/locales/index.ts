import { LANGUAGE_CATALOG, DEFAULT_LANGUAGE_CODE, resolveLanguageItem, LanguageCatalogItem } from './catalog';
import { TranslationDictionary, RecursivePartial, TranslationKeyPath } from './types';
import { en } from './dictionaries/en';
import {
  DICTIONARY_MODULE_LOADERS,
  resolveDictionaryModuleKey,
} from './dictionary-module-loaders';

export * from './catalog';
export * from './types';

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

const loadedModulePartials = new Map<string, RecursivePartial<TranslationDictionary>>();
const loadInflight = new Map<string, Promise<void>>();
const resolvedDictionaryCache = new Map<string, TranslationDictionary>();

function isEnglishCode(code: string): boolean {
  return code === DEFAULT_LANGUAGE_CODE || code.startsWith('en-');
}

/** True when this language has its own UI strings. Others still steer the assistant, and the interface stays English. */
export function hasUiDictionary(langCode?: string | null): boolean {
  const item = resolveLanguageItem(langCode);
  const code = item.code.toLowerCase();
  if (isEnglishCode(code)) return true;
  return resolveDictionaryModuleKey(code) != null;
}

function getLoadedOverride(langCode: string): RecursivePartial<TranslationDictionary> | undefined {
  const moduleKey = resolveDictionaryModuleKey(langCode);
  if (!moduleKey) {
    return undefined;
  }
  return loadedModulePartials.get(moduleKey);
}

export function getDictionary(langCode?: string | null): TranslationDictionary {
  const item = resolveLanguageItem(langCode);
  const code = item.code.toLowerCase();

  const cached = resolvedDictionaryCache.get(code);
  if (cached) return cached;

  if (isEnglishCode(code)) {
    resolvedDictionaryCache.set(code, en);
    return en;
  }

  const rawOverride = getLoadedOverride(code);
  const merged = deepMergeWithFallback(en, rawOverride) as TranslationDictionary;
  resolvedDictionaryCache.set(code, merged);
  return merged;
}

export async function ensureDictionaryLoaded(langCode?: string | null): Promise<void> {
  const item = resolveLanguageItem(langCode);
  const code = item.code.toLowerCase();
  if (isEnglishCode(code)) {
    return;
  }

  const moduleKey = resolveDictionaryModuleKey(code);
  if (!moduleKey) {
    return;
  }

  if (loadedModulePartials.has(moduleKey)) {
    return;
  }

  const inflight = loadInflight.get(moduleKey);
  if (inflight) {
    await inflight;
    return;
  }

  const loader = DICTIONARY_MODULE_LOADERS[moduleKey];
  if (!loader) {
    return;
  }

  const promise = loader()
    .then((partial) => {
      loadedModulePartials.set(moduleKey, partial);
      Array.from(resolvedDictionaryCache.keys()).forEach((key) => {
        if (resolveDictionaryModuleKey(key) === moduleKey) {
          resolvedDictionaryCache.delete(key);
        }
      });
    })
    .finally(() => {
      loadInflight.delete(moduleKey);
    });

  loadInflight.set(moduleKey, promise);
  await promise;
}

/** Warms every on-disk dictionary (Jest / parity tests). */
export async function preloadAllDictionaries(): Promise<void> {
  const keys = Object.keys(DICTIONARY_MODULE_LOADERS);
  await Promise.all(keys.map((key) => ensureDictionaryLoaded(key)));
  for (const item of LANGUAGE_CATALOG) {
    await ensureDictionaryLoaded(item.code);
  }
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

export type { LanguageCatalogItem };
