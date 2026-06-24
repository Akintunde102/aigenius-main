/** Persisted appearance: light vs dark vs system. Sidebar and Canvas adapt via CSS vars. */

export const COLOR_MODE_STORAGE_KEY = 'aigenius-color-mode';

export type ColorMode = 'light' | 'dark' | 'system';

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
  const root = document.documentElement;

  let resolved: 'light' | 'dark' = 'dark';
  if (mode === 'system') {
    if (typeof window !== 'undefined') {
      resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
  } else {
    resolved = mode;
  }

  if (resolved === 'dark') {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
}

export function persistColorMode(mode: ColorMode): void {
  try {
    localStorage.setItem(COLOR_MODE_STORAGE_KEY, mode);
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
