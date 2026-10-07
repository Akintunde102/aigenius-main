/**
 * Display helpers for backend-provided platform credits.
 * USD → credits conversion happens only on the API (`usdToPlatformCredits`).
 */

function parsePositiveRate(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat((raw ?? '').trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const WALLET_PAYMENT_CURRENCY = 'USD' as const;

/** Fallback until `/wallet/credits-config` loads. Backend is the source of truth. */
export const MIN_TOP_UP_CREDITS = parsePositiveRate(
  process.env.NEXT_PUBLIC_MIN_WALLET_TOP_UP_CREDITS,
  1000,
);

/** Matches backend `USD_TO_CREDITS_RATE` default for display-only conversion of API USD rates. */
export const DEFAULT_CREDITS_PER_USD = parsePositiveRate(
  process.env.NEXT_PUBLIC_CREDITS_PER_USD,
  1000,
);

/** Convert a billed USD amount from the models API into platform credits for UI. */
export function billedUsdToDisplayCredits(usd: number): number {
  if (!Number.isFinite(usd) || usd < 0) {
    return 0;
  }
  return usd * DEFAULT_CREDITS_PER_USD;
}

/** Free credits granted to new accounts at registration. */
export const SIGNUP_BONUS_CREDITS = 100;

/** Convert credits to USD using the rate published by the backend credits-config. */
export function creditsToUsd(credits: number, creditsPerUsd: number): number {
  if (!Number.isFinite(credits) || credits < 0 || !Number.isFinite(creditsPerUsd) || creditsPerUsd <= 0) {
    return 0;
  }
  return Math.round((credits / creditsPerUsd) * 100) / 100;
}

export function formatCredits(value: number, options?: { compact?: boolean }): string {
  if (!Number.isFinite(value)) {
    return '0 credits';
  }
  const formatted = value.toLocaleString(undefined, {
    maximumFractionDigits: options?.compact ? 0 : 2,
  });
  return `${formatted} credits`;
}

export function formatUsdAmount(amount: number): string {
  if (!Number.isFinite(amount)) {
    return '$0.00';
  }
  return `$${amount.toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

export function getCreditEquivalenceLabel(creditsPerUsd: number): string {
  if (!Number.isFinite(creditsPerUsd) || creditsPerUsd <= 0) {
    return 'Credits priced by the server';
  }
  return `${creditsPerUsd.toLocaleString()} credits = $1.00 USD`;
}
