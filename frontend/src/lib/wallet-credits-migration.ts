/** Must match backend `WALLET_CREDITS_MIGRATION_VERSION` for legacy NGN → USD credits. */
export const LEGACY_WALLET_MIGRATION_VERSION = "legacy-ngn-v1";

/** How long the post-migration notice stays relevant (default: 14 days). */
const parsePositiveDays = (raw: string | undefined, fallback: number): number => {
  const parsed = Number.parseInt((raw ?? "").trim(), 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
};

export const WALLET_MIGRATION_BANNER_MAX_AGE_DAYS = parsePositiveDays(
  process.env.NEXT_PUBLIC_WALLET_MIGRATION_BANNER_MAX_AGE_DAYS,
  14,
);

export const WALLET_MIGRATION_BANNER_MAX_AGE_MS =
  WALLET_MIGRATION_BANNER_MAX_AGE_DAYS * 24 * 60 * 60 * 1000;

export const WALLET_CREDITS_UPDATED_EVENT = "aigenius-wallet-credits-updated";

export type WalletCreditsMigrationRecord = {
  version: string;
  migratedAt: string;
  previousLegacyBalance: number;
  newBalanceCredits: number;
  ngnPerUsd: number;
  creditsPerUsd: number;
};

/**
 * Only users processed by the one-time migration script have this object.
 * Post-migration top-ups do not set it — they must not see the banner.
 */
export function isLegacyWalletMigrationRecord(
  record: unknown,
): record is WalletCreditsMigrationRecord {
  if (!record || typeof record !== "object") {
    return false;
  }

  const candidate = record as WalletCreditsMigrationRecord;

  return (
    candidate.version === LEGACY_WALLET_MIGRATION_VERSION
    && typeof candidate.migratedAt === "string"
    && candidate.migratedAt.length > 0
    && typeof candidate.previousLegacyBalance === "number"
    && Number.isFinite(candidate.previousLegacyBalance)
    && candidate.previousLegacyBalance > 0
    && typeof candidate.newBalanceCredits === "number"
    && Number.isFinite(candidate.newBalanceCredits)
    && candidate.newBalanceCredits >= 0
    && typeof candidate.ngnPerUsd === "number"
    && Number.isFinite(candidate.ngnPerUsd)
    && candidate.ngnPerUsd > 0
    && typeof candidate.creditsPerUsd === "number"
    && Number.isFinite(candidate.creditsPerUsd)
    && candidate.creditsPerUsd > 0
    && candidate.previousLegacyBalance !== candidate.newBalanceCredits
  );
}

export function formatMigrationBalance(value: number): string {
  return value.toLocaleString(undefined, { maximumFractionDigits: 0 });
}

export function isWalletMigrationNoticeExpired(
  migratedAt: string,
  nowMs: number = Date.now(),
): boolean {
  const migratedAtMs = Date.parse(migratedAt);
  if (!Number.isFinite(migratedAtMs)) {
    return true;
  }
  return nowMs - migratedAtMs > WALLET_MIGRATION_BANNER_MAX_AGE_MS;
}

/** True when the user has topped up since the one-time migration credit grant. */
export function hasToppedUpSinceWalletMigration(
  record: WalletCreditsMigrationRecord,
  currentWalletBalance: number,
): boolean {
  if (!Number.isFinite(currentWalletBalance)) {
    return false;
  }
  return currentWalletBalance > record.newBalanceCredits;
}

export type WalletMigrationBannerVisibilityInput = {
  record: unknown;
  userId: string;
  isDismissed: boolean;
  nowMs?: number;
};

export function shouldShowWalletMigrationBanner(
  input: WalletMigrationBannerVisibilityInput,
): input is WalletMigrationBannerVisibilityInput & {
  record: WalletCreditsMigrationRecord;
} {
  if (!isLegacyWalletMigrationRecord(input.record)) {
    return false;
  }
  if (input.isDismissed) {
    return false;
  }
  if (isWalletMigrationNoticeExpired(input.record.migratedAt, input.nowMs)) {
    return false;
  }
  return true;
}

/** Call after a verified wallet top-up — not on initial page load (cached balances lie). */
export function shouldHideMigrationBannerAfterTopUp(
  record: WalletCreditsMigrationRecord,
  balanceAfterTopUp: number,
): boolean {
  return hasToppedUpSinceWalletMigration(record, balanceAfterTopUp);
}

export function notifyWalletCreditsUpdated(newBalance?: number | null): void {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(
    new CustomEvent(WALLET_CREDITS_UPDATED_EVENT, {
      detail: {
        newBalance: typeof newBalance === "number" && Number.isFinite(newBalance)
          ? newBalance
          : null,
      },
    }),
  );
}
