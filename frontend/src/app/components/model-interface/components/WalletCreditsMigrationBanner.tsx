"use client";

import React, { useEffect, useState } from "react";
import { ArrowRight, X } from "lucide-react";
import { creditsToUsd, formatUsdAmount } from "@/lib/credits";
import {
  formatMigrationBalance,
  isLegacyWalletMigrationRecord,
  isWalletMigrationNoticeExpired,
  shouldHideMigrationBannerAfterTopUp,
  shouldShowWalletMigrationBanner,
  WALLET_CREDITS_UPDATED_EVENT,
  type WalletCreditsMigrationRecord,
} from "@/lib/wallet-credits-migration";
import { clearUserDetailsCache, getUserDetails } from "@/lib/calls/get-logged-user-details";

const DISMISS_STORAGE_KEY = "wallet_credits_migration_notice_dismissed_v2";

type DismissedMigrationNotice = {
  userId: string;
  migratedAt: string;
};

function readDismissedNotices(): DismissedMigrationNotice[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(DISMISS_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((entry): entry is DismissedMigrationNotice =>
      Boolean(
        entry &&
        typeof entry === "object" &&
        typeof (entry as DismissedMigrationNotice).userId === "string" &&
        typeof (entry as DismissedMigrationNotice).migratedAt === "string",
      ),
    );
  } catch {
    return [];
  }
}

function isNoticeDismissed(userId: string, migratedAt: string): boolean {
  return readDismissedNotices().some(
    (entry) => entry.userId === userId && entry.migratedAt === migratedAt,
  );
}

function dismissNotice(userId: string, migratedAt: string) {
  const next = readDismissedNotices().filter(
    (entry) => !(entry.userId === userId && entry.migratedAt === migratedAt),
  );
  next.push({ userId, migratedAt });
  window.localStorage.setItem(DISMISS_STORAGE_KEY, JSON.stringify(next));
}

function persistExpiryDismissIfNeeded(
  userId: string,
  record: WalletCreditsMigrationRecord,
  dismissed: boolean,
): void {
  if (dismissed) {
    return;
  }
  if (isWalletMigrationNoticeExpired(record.migratedAt)) {
    dismissNotice(userId, record.migratedAt);
  }
}

export function WalletCreditsMigrationBanner() {
  const [migration, setMigration] =
    useState<WalletCreditsMigrationRecord | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [visible, setVisible] = useState(false);

  const evaluateAndSetBanner = React.useCallback(async (forceRefresh = true) => {
    try {
      const user = await getUserDetails(forceRefresh);
      if (!user?.id) {
        setVisible(false);
        return;
      }

      const record = user.config?.walletCreditsMigration;
      if (!isLegacyWalletMigrationRecord(record)) {
        setVisible(false);
        return;
      }

      let dismissed = isNoticeDismissed(user.id, record.migratedAt);
      persistExpiryDismissIfNeeded(user.id, record, dismissed);
      dismissed = isNoticeDismissed(user.id, record.migratedAt);

      if (!shouldShowWalletMigrationBanner({
        record,
        userId: user.id,
        isDismissed: dismissed,
      })) {
        setVisible(false);
        return;
      }

      setUserId(user.id);
      setMigration(record);
      setVisible(true);
    } catch {
      // Non-blocking notice.
    }
  }, []);

  useEffect(() => {
    void evaluateAndSetBanner();
  }, [evaluateAndSetBanner]);

  useEffect(() => {
    const onWalletUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ newBalance?: number | null }>).detail;
      clearUserDetailsCache();
      void (async () => {
        const user = await getUserDetails(true);
        const record = user?.config?.walletCreditsMigration;
        if (!user?.id || !isLegacyWalletMigrationRecord(record)) {
          return;
        }

        const balance = typeof detail?.newBalance === "number"
          ? detail.newBalance
          : (typeof user.config?.wallet === "number" ? user.config.wallet : null);

        if (balance !== null && shouldHideMigrationBannerAfterTopUp(record, balance)) {
          dismissNotice(user.id, record.migratedAt);
          setVisible(false);
          return;
        }

        await evaluateAndSetBanner(true);
      })();
    };

    window.addEventListener(WALLET_CREDITS_UPDATED_EVENT, onWalletUpdated);
    return () => {
      window.removeEventListener(WALLET_CREDITS_UPDATED_EVENT, onWalletUpdated);
    };
  }, [evaluateAndSetBanner]);

  if (!visible || !migration || !userId) {
    return null;
  }

  const previous = formatMigrationBalance(migration.previousLegacyBalance);
  const next = formatMigrationBalance(migration.newBalanceCredits);
  const rate = formatMigrationBalance(migration.ngnPerUsd);
  const usdValue = formatUsdAmount(creditsToUsd(migration.newBalanceCredits));

  const handleDismiss = () => {
    dismissNotice(userId, migration.migratedAt);
    setVisible(false);
  };

  return (
    <div
      className="pointer-events-none fixed inset-x-0 top-0 z-[1090] flex justify-center px-3 sm:px-4"
      style={{
        paddingTop: "calc(0.75rem + var(--aigenius-desktop-titlebar-top, 0px))",
      }}
    >
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-auto flex w-full max-w-xl items-center gap-3 rounded-full border border-[color:var(--app-border-soft)] bg-[var(--app-panel)] py-2 pl-4 pr-2 shadow-[var(--app-shadow-soft)] backdrop-blur-sm"
      >
        <span
          className="h-1.5 w-1.5 shrink-0 rounded-full bg-[color:var(--app-ink-900)]"
          aria-hidden
        />

        <p className="min-w-0 flex-1 truncate text-sm text-[color:var(--app-ink-700)]">
          <span className="font-medium text-[color:var(--app-ink-900)]">
            Balance converted to USD.
          </span>{" "}
          <span className="tabular-nums">{previous}</span>
          <ArrowRight
            className="mx-1 inline h-3 w-3 -translate-y-px text-[color:var(--chat-muted-fg)]"
            aria-hidden
          />
          <span className="tabular-nums font-medium text-[color:var(--app-ink-900)]">
            {next} credits
          </span>
          <span className="text-[color:var(--chat-muted-fg)]">
            {" "}
            (≈ {usdValue}, ₦{rate}/$1)
          </span>
        </p>

        <button
          type="button"
          onClick={handleDismiss}
          className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[color:var(--chat-muted-fg)] transition-colors hover:bg-[color:var(--app-ink-900)]/5 hover:text-[color:var(--app-ink-900)] focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-[color:var(--app-ink-900)]"
          aria-label="Dismiss balance conversion notice"
        >
          <X className="h-3.5 w-3.5" aria-hidden />
        </button>
      </div>
    </div>
  );
}
