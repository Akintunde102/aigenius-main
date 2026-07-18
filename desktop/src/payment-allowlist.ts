/**
 * Hosted payment checkout URLs that may load in a handoff child window (same pattern as OAuth).
 * When Paystack redirects back to the local Next server, `registerLocalOriginHandoff` forwards
 * the URL to the main shell so verification runs inside the app—not the system browser.
 */

const PAYMENT_HOST_SUFFIXES = ['paystack.com', 'paystack.co'] as const;

function hostnameMatchesSuffix(hostname: string, suffix: string): boolean {
  const h = hostname.toLowerCase();
  const s = suffix.toLowerCase().replace(/^\./, '');
  if (!s) {
    return false;
  }
  return h === s || h.endsWith(`.${s}`);
}

/** True when this URL is a third-party hosted checkout (Paystack) that should stay in Electron. */
export function isHostedPaymentUrl(urlString: string): boolean {
  if (urlString === 'about:blank' || urlString.startsWith('about:blank?')) {
    return false;
  }

  let u: URL;
  try {
    u = new URL(urlString);
  } catch {
    return false;
  }

  if (u.protocol !== 'http:' && u.protocol !== 'https:') {
    return false;
  }

  const host = u.hostname.toLowerCase();
  return PAYMENT_HOST_SUFFIXES.some((suffix) => hostnameMatchesSuffix(host, suffix));
}
