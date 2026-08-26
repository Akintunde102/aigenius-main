import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';

const DEFAULT_DESKTOP_APP_ORIGIN = 'https://aigenius.noboxlabs.xyz';

function normalizeOrigin(origin: string): string {
  return origin.trim().replace(/\/$/, '');
}

function isHttpOrigin(origin: string): boolean {
  return origin.startsWith('http://') || origin.startsWith('https://');
}

/**
 * Public origin used for Paystack/Payaza return URLs and other browser redirects.
 * Desktop shells using `aigenius://` must redirect to the hosted web app, not the custom protocol.
 */
export function getAppPublicOrigin(): string {
  const configured = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim();
  if (configured) {
    return normalizeOrigin(configured);
  }

  if (typeof window === 'undefined') {
    return '';
  }

  const currentOrigin = window.location.origin;
  if (isHttpOrigin(currentOrigin)) {
    return normalizeOrigin(currentOrigin);
  }

  if (isAigeniusDesktopRuntime() || currentOrigin.startsWith('aigenius://')) {
    return DEFAULT_DESKTOP_APP_ORIGIN;
  }

  return normalizeOrigin(currentOrigin);
}
