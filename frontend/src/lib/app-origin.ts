/**
 * Public origin used for Paystack return URLs and other browser redirects.
 * Prefer NEXT_PUBLIC_APP_ORIGIN when set (production / desktop build); fall back to the current page.
 */
export function getAppPublicOrigin(): string {
  if (typeof window === 'undefined') {
    const configured = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim();
    return configured ? configured.replace(/\/$/, '') : '';
  }

  const configured = process.env.NEXT_PUBLIC_APP_ORIGIN?.trim();
  if (configured) {
    return configured.replace(/\/$/, '');
  }

  return window.location.origin;
}
