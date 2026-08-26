/** Persisted appearance: light vs dark vs system. Sidebar and Canvas adapt via CSS vars. */

export const COLOR_MODE_STORAGE_KEY = 'aigenius-color-mode';

/** Legacy landing-page key — kept in sync with {@link COLOR_MODE_STORAGE_KEY}. */
export const LEGACY_THEME_STORAGE_KEY = 'aigenius-theme';

export type ColorMode = 'light' | 'dark' | 'system';

export function resolveStoredColorMode(
  colorMode: string | null,
  legacyTheme: string | null,
  prefersDark: boolean,
): 'light' | 'dark' {
  if (colorMode === 'light' || colorMode === 'dark') {
    return colorMode;
  }
  if (legacyTheme === 'light' || legacyTheme === 'dark') {
    return legacyTheme;
  }
  return prefersDark ? 'dark' : 'light';
}

export function applyResolvedColorMode(resolved: 'light' | 'dark'): void {
  if (typeof document === 'undefined') {
    return;
  }

  const root = document.documentElement;
  root.setAttribute('data-theme', resolved);
  root.style.colorScheme = resolved;

  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function getStoredColorMode(): ColorMode {
  if (typeof window === 'undefined') return 'system';
  try {
    const raw = localStorage.getItem(COLOR_MODE_STORAGE_KEY);
    if (raw === 'dark' || raw === 'light' || raw === 'system') return raw;
  } catch {
    /* ignore */
  }
  return 'system';
}

export function applyColorMode(mode: ColorMode): void {
  let resolved: 'light' | 'dark' = 'dark';
  if (mode === 'system') {
    if (typeof window !== 'undefined') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
  } else {
    resolved = mode;
  }

  applyResolvedColorMode(resolved);
}

export function persistColorMode(mode: ColorMode): void {
  try {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
    if (mode === 'light' || mode === 'dark') {
      localStorage.setItem(LEGACY_THEME_STORAGE_KEY, mode);
    }
  } catch {
    /* ignore */
  }
}

export function toggleColorMode(current: ColorMode): ColorMode {
  // Cycle: system -> light -> dark -> system
  let next: ColorMode = 'system';
  if (current === 'system') next = 'light';
  else if (current === 'light') next = 'dark';
  else if (current === 'dark') next = 'system';

  persistColorMode(next);
  applyColorMode(next);
  return next;
}

/** Minimal paint-blocking styles until globals.css loads. */
export const COLOR_MODE_BOOTSTRAP_CRITICAL_CSS =
  'html.dark,html.dark body,html[data-theme=dark],html[data-theme=dark] body{background-color:#0b0b0e;color:#e8eaef;color-scheme:dark}';

/** Inline in <head> before CSS — avoids a light flash on refresh. */
export const COLOR_MODE_BOOTSTRAP_SCRIPT = `(function(){try{var ck=${JSON.stringify(COLOR_MODE_STORAGE_KEY)};var lk=${JSON.stringify(LEGACY_THEME_STORAGE_KEY)};var cm=localStorage.getItem(ck);var lt=localStorage.getItem(lk);var prefersDark=window.matchMedia('(prefers-color-scheme: dark)').matches;var resolved='light';if(cm==='dark'||cm==='light'){resolved=cm;}else if(lt==='dark'||lt==='light'){resolved=lt;}else{resolved=prefersDark?'dark':'light';}var r=document.documentElement;r.setAttribute('data-theme',resolved);r.style.colorScheme=resolved;if(resolved==='dark'){r.classList.add('dark');}else{r.classList.remove('dark');}}catch(e){}})();`;
