import {
  isLegacyWalletMigrationRecord,
  isWalletMigrationNoticeExpired,
  LEGACY_WALLET_MIGRATION_VERSION,
  shouldHideMigrationBannerAfterTopUp,
  shouldShowWalletMigrationBanner,
  WALLET_MIGRATION_BANNER_MAX_AGE_MS,
} from "@/lib/wallet-credits-migration";

describe("isLegacyWalletMigrationRecord", () => {
  const validRecord = {
    version: LEGACY_WALLET_MIGRATION_VERSION,
    migratedAt: "2026-08-19T12:00:00.000Z",
    previousLegacyBalance: 5000,
    newBalanceCredits: 3706,
    ngnPerUsd: 1349,
    creditsPerUsd: 1000,
  };

  it("accepts a complete migration record from the backend script", () => {
    expect(isLegacyWalletMigrationRecord(validRecord)).toBe(true);
  });

  it("rejects users without a migration record (post-update top-ups)", () => {
    expect(isLegacyWalletMigrationRecord(undefined)).toBe(false);
    expect(isLegacyWalletMigrationRecord(null)).toBe(false);
    expect(isLegacyWalletMigrationRecord({})).toBe(false);
  });

  it("rejects records with the wrong migration version", () => {
    expect(isLegacyWalletMigrationRecord({ ...validRecord, version: "other" })).toBe(false);
  });

  it("rejects unchanged balances", () => {
    expect(
      isLegacyWalletMigrationRecord({
        ...validRecord,
        previousLegacyBalance: 1000,
        newBalanceCredits: 1000,
      }),
    ).toBe(false);
  });
});

describe("wallet migration banner visibility", () => {
  const validRecord = {
    version: LEGACY_WALLET_MIGRATION_VERSION,
    migratedAt: "2026-08-19T12:00:00.000Z",
    previousLegacyBalance: 5000,
    newBalanceCredits: 3706,
    ngnPerUsd: 1349,
    creditsPerUsd: 1000,
  };

  it("hides after the max age window", () => {
    const nowMs = Date.parse("2026-08-19T12:00:00.000Z") + WALLET_MIGRATION_BANNER_MAX_AGE_MS + 1;
    expect(isWalletMigrationNoticeExpired(validRecord.migratedAt, nowMs)).toBe(true);
    expect(shouldShowWalletMigrationBanner({
      record: validRecord,
      userId: "user-1",
      isDismissed: false,
      nowMs,
    })).toBe(false);
  });

  it("hides after a verified post-migration top-up", () => {
    expect(shouldHideMigrationBannerAfterTopUp(validRecord, 5000)).toBe(true);
    expect(shouldShowWalletMigrationBanner({
      record: validRecord,
      userId: "user-1",
      isDismissed: false,
    })).toBe(true);
  });
});
