import { LANGUAGE_CATALOG, LANGUAGE_MAP, DEFAULT_LANGUAGE_CODE, resolveLanguageItem, LanguageCatalogItem } from './catalog';
import { TranslationDictionary, RecursivePartial, TranslationKeyPath } from './types';
import { af } from './dictionaries/af';
import { am } from './dictionaries/am';
import { ar } from './dictionaries/ar';
import { as } from './dictionaries/as';
import { az } from './dictionaries/az';
import { be } from './dictionaries/be';
import { bg } from './dictionaries/bg';
import { bn } from './dictionaries/bn';
import { bs } from './dictionaries/bs';
import { ca } from './dictionaries/ca';
import { chr } from './dictionaries/chr';
import { cs } from './dictionaries/cs';
import { cy } from './dictionaries/cy';
import { da } from './dictionaries/da';
import { de } from './dictionaries/de';
import { el } from './dictionaries/el';
import { en } from './dictionaries/en';
import { es } from './dictionaries/es';
import { et } from './dictionaries/et';
import { eu } from './dictionaries/eu';
import { fa } from './dictionaries/fa';
import { fi } from './dictionaries/fi';
import { fil } from './dictionaries/fil';
import { fr } from './dictionaries/fr';
import { ga } from './dictionaries/ga';
import { gd } from './dictionaries/gd';
import { gl } from './dictionaries/gl';
import { gu } from './dictionaries/gu';
import { ha } from './dictionaries/ha';
import { he } from './dictionaries/he';
import { hi } from './dictionaries/hi';
import { hr } from './dictionaries/hr';
import { hu } from './dictionaries/hu';
import { hy } from './dictionaries/hy';
import { id } from './dictionaries/id';
import { ig } from './dictionaries/ig';
import { is } from './dictionaries/is';
import { it } from './dictionaries/it';
import { iu } from './dictionaries/iu';
import { ja } from './dictionaries/ja';
import { ka } from './dictionaries/ka';
import { kk } from './dictionaries/kk';
import { km } from './dictionaries/km';
import { kn } from './dictionaries/kn';
import { ko } from './dictionaries/ko';
import { kok } from './dictionaries/kok';
import { ku } from './dictionaries/ku';
import { ky } from './dictionaries/ky';
import { lb } from './dictionaries/lb';
import { lo } from './dictionaries/lo';
import { lt } from './dictionaries/lt';
import { lv } from './dictionaries/lv';
import { mk } from './dictionaries/mk';
import { ml } from './dictionaries/ml';
import { mn } from './dictionaries/mn';
import { mr } from './dictionaries/mr';
import { ms } from './dictionaries/ms';
import { mt } from './dictionaries/mt';
import { my } from './dictionaries/my';
import { ne } from './dictionaries/ne';
import { nl } from './dictionaries/nl';
import { no } from './dictionaries/no';
import { nso } from './dictionaries/nso';
import { or } from './dictionaries/or';
import { pa } from './dictionaries/pa';
import { pl } from './dictionaries/pl';
import { prs } from './dictionaries/prs';
import { ptBr } from './dictionaries/pt-br';
import { pt } from './dictionaries/pt';
import { quc } from './dictionaries/quc';
import { quz } from './dictionaries/quz';
import { ro } from './dictionaries/ro';
import { ru } from './dictionaries/ru';
import { rw } from './dictionaries/rw';
import { sd } from './dictionaries/sd';
import { si } from './dictionaries/si';
import { sk } from './dictionaries/sk';
import { sl } from './dictionaries/sl';
import { sq } from './dictionaries/sq';
import { srCyrl } from './dictionaries/sr-cyrl';
import { srLatn } from './dictionaries/sr-latn';
import { sv } from './dictionaries/sv';
import { sw } from './dictionaries/sw';
import { ta } from './dictionaries/ta';
import { te } from './dictionaries/te';
import { tg } from './dictionaries/tg';
import { th } from './dictionaries/th';
import { tk } from './dictionaries/tk';
import { tn } from './dictionaries/tn';
import { tr } from './dictionaries/tr';
import { tt } from './dictionaries/tt';
import { ug } from './dictionaries/ug';
import { uk } from './dictionaries/uk';
import { ur } from './dictionaries/ur';
import { uz } from './dictionaries/uz';
import { vi } from './dictionaries/vi';
import { wo } from './dictionaries/wo';
import { xh } from './dictionaries/xh';
import { yo } from './dictionaries/yo';
import { zhTw } from './dictionaries/zh-tw';
import { zh } from './dictionaries/zh';
import { zu } from './dictionaries/zu';

export * from './catalog';
export * from './types';

const DICTIONARY_REGISTRY: Record<string, RecursivePartial<TranslationDictionary>> = {
  'af': af,
  'am': am,
  'ar': ar,
  'as': as,
  'az': az,
  'be': be,
  'bg': bg,
  'bn': bn,
  'bs': bs,
  'ca': ca,
  'chr': chr,
  'cs': cs,
  'cy': cy,
  'da': da,
  'de': de,
  'el': el,
  'en': en,
  'es': es,
  'et': et,
  'eu': eu,
  'fa': fa,
  'fi': fi,
  'fil': fil,
  'fr': fr,
  'ga': ga,
  'gd': gd,
  'gl': gl,
  'gu': gu,
  'ha': ha,
  'he': he,
  'hi': hi,
  'hr': hr,
  'hu': hu,
  'hy': hy,
  'id': id,
  'ig': ig,
  'is': is,
  'it': it,
  'iu': iu,
  'ja': ja,
  'ka': ka,
  'kk': kk,
  'km': km,
  'kn': kn,
  'ko': ko,
  'kok': kok,
  'ku': ku,
  'ky': ky,
  'lb': lb,
  'lo': lo,
  'lt': lt,
  'lv': lv,
  'mk': mk,
  'ml': ml,
  'mn': mn,
  'mr': mr,
  'ms': ms,
  'mt': mt,
  'my': my,
  'ne': ne,
  'nl': nl,
  'no': no,
  'nso': nso,
  'or': or,
  'pa': pa,
  'pl': pl,
  'prs': prs,
  'pt-br': ptBr,
  'pt': pt,
  'quc': quc,
  'quz': quz,
  'ro': ro,
  'ru': ru,
  'rw': rw,
  'sd': sd,
  'si': si,
  'sk': sk,
  'sl': sl,
  'sq': sq,
  'sr-cyrl': srCyrl,
  'sr-latn': srLatn,
  'sv': sv,
  'sw': sw,
  'ta': ta,
  'te': te,
  'tg': tg,
  'th': th,
  'tk': tk,
  'tn': tn,
  'tr': tr,
  'tt': tt,
  'ug': ug,
  'uk': uk,
  'ur': ur,
  'uz': uz,
  'vi': vi,
  'wo': wo,
  'xh': xh,
  'yo': yo,
  'zh-tw': zhTw,
  'zh': zh,
  'zu': zu,
  'zh-cn': zh,
  'zh-hk': zhTw,
  'pt-pt': pt,
  'es-es': es,
  'es-mx': es,
  'fr-fr': fr,
  'fr-ca': fr,
  'en-us': en,
  'en-gb': en,
  'en-ca': en,
  'en-au': en,
  'nb-no': no,
  'nn-no': no,
  'sr-latn-rs': srLatn,
  'sr-cyrl-rs': srCyrl,
  'bs-latn-ba': bs,
  'uz-latn-uz': uz,
  'az-latn-az': az,
  'chr-cher-us': chr,
  'iu-cans': iu,
  'quc-latn': quc,
  'ha-latn-ng': ha,
  'yo-latn-ng': yo,
  'ig-latn-ng': ig,
  'am-et': am,
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
