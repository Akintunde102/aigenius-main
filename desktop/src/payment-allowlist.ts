/**
 * Hosted payment checkout URLs that open in the system browser without an extra approval dialog.
 * Flutterwave Standard returns `https://checkout.flutterwave.com/v3/hosted/pay/...`.
 */

const PAYMENT_HOST_SUFFIXES = [
  'paystack.com',
  'paystack.co',
  'payaza.africa',
  'flutterwave.com',
  'flutterwave.co',
] as const;

function hostnameMatchesSuffix(hostname: string, suffix: string): boolean {
  const h = hostname.toLowerCase();
  const s = suffix.toLowerCase().replace(/^\./, '');
  if (!s) {
    return false;
  }
  return h === s || h.endsWith(`.${s}`);
}

/** True when this URL is a third-party hosted wallet checkout (Paystack, Payaza, Flutterwave). */
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
