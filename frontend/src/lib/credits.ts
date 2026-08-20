/**
 * Wallet credits — 1000 credits = $1 USD.
 */

function parsePositiveRate(raw: string | undefined, fallback: number): number {
  const parsed = Number.parseFloat((raw ?? '').trim());
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const CREDITS_PER_USD = parsePositiveRate(
  process.env.NEXT_PUBLIC_CREDITS_PER_USD,
  1000,
);

export const USD_TO_CREDITS_RATE = CREDITS_PER_USD;

/** @deprecated Use USD_TO_CREDITS_RATE */
export const USD_TO_NGN = USD_TO_CREDITS_RATE;

export const WALLET_PAYMENT_CURRENCY = 'USD' as const;

export const MIN_TOP_UP_CREDITS = parsePositiveRate(
  process.env.NEXT_PUBLIC_MIN_WALLET_TOP_UP_CREDITS,
  1000,
);

/** Free credits granted to new accounts at registration. */
export const SIGNUP_BONUS_CREDITS = 100;

export function creditsToUsd(credits: number): number {
  return Math.round((credits / CREDITS_PER_USD) * 100) / 100;
}

export function usdToCredits(usd: number): number {
  if (!Number.isFinite(usd)) {
    return 0;
  }
  return Math.round(usd * CREDITS_PER_USD);
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

export function usdCostToCredits(usd: number): number {
  return usdToCredits(usd);
}

export function formatUsdCostAsCredits(usd: number): string {
  return formatCredits(usdCostToCredits(usd), { compact: true });
}

export function getCreditEquivalenceLabel(): string {
  return '1,000 credits = $1.00 USD';
}
