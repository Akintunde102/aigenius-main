/** Client locale persistence (mirrors LanguageProvider / bootstrap script). */

export const LOCALE_STORAGE_KEY = 'aigenius_locale';
export const LOCALE_COOKIE_KEY = 'aigenius_locale';
export const LOCALE_HTML_ATTR = 'data-aigenius-locale';

export function readStoredLocaleCode(): string | null {
  if (typeof window === 'undefined') {
    return null;
  }
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && stored.trim()) {
      return stored.trim();
    }
    const match = document.cookie.match(new RegExp(`(?:^|; )${LOCALE_COOKIE_KEY}=([^;]*)`));
    if (match?.[1]) {
      return decodeURIComponent(match[1]).trim();
    }
    const fromDom = document.documentElement.getAttribute(LOCALE_HTML_ATTR);
    if (fromDom && fromDom.trim()) {
      return fromDom.trim();
    }
  } catch {
    /* ignore */
  }
  return null;
}

export function hasExplicitStoredLocale(): boolean {
  return readStoredLocaleCode() != null;
}

export function persistClientLocaleCode(code: string): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    localStorage.setItem(LOCALE_STORAGE_KEY, code);
    document.cookie = `${LOCALE_COOKIE_KEY}=${encodeURIComponent(code)}; path=/; max-age=31536000; SameSite=Lax`;
    document.documentElement.lang = code;
    document.documentElement.setAttribute(LOCALE_HTML_ATTR, code);
    document.documentElement.dir = 'ltr';
  } catch {
    /* ignore */
  }
}

/** Inline in <head> before React — aligns html lang with cookie/localStorage. */
export const LOCALE_BOOTSTRAP_SCRIPT = `(function(){try{var sk=${JSON.stringify(LOCALE_STORAGE_KEY)};var ck=${JSON.stringify(LOCALE_COOKIE_KEY)};var attr=${JSON.stringify(LOCALE_HTML_ATTR)};var code=null;var stored=localStorage.getItem(sk);if(stored&&stored.trim()){code=stored.trim();}else{var m=document.cookie.match(new RegExp('(?:^|; )'+ck+'=([^;]*)'));if(m&&m[1]){code=decodeURIComponent(m[1]).trim();}}if(code){var r=document.documentElement;r.lang=code;r.setAttribute(attr,code);r.dir='ltr';}}catch(e){}})();`;
