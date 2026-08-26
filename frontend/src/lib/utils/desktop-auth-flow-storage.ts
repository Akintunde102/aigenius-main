import type { DesktopAuthFlowPhase } from '@/app/components/auth/GoogleSignIn';

const STORAGE_KEY = 'aigenius_desktop_auth_flow';

export function readDesktopAuthFlowPhase(): DesktopAuthFlowPhase {
  if (typeof window === 'undefined') {
    return 'idle';
  }
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw === 'awaiting-browser' || raw === 'completing') {
      return raw;
    }
  } catch {
    /* ignore */
  }
  return 'idle';
}

export function writeDesktopAuthFlowPhase(phase: DesktopAuthFlowPhase): void {
  if (typeof window === 'undefined') {
    return;
  }
  try {
    if (phase === 'idle') {
      sessionStorage.removeItem(STORAGE_KEY);
    } else {
      sessionStorage.setItem(STORAGE_KEY, phase);
    }
  } catch {
    /* ignore */
  }
}
