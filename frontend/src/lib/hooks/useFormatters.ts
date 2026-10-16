'use client';

import { useMemo } from 'react';
import { useLanguage } from '@/lib/providers/LanguageProvider';
import {
  formatMemberSinceDate,
  formatWalletBalance,
} from '@/app/components/ChatHistorySidebar/me-account-display.utils';

/** Intl formatters bound to the active UI locale. */
export function useFormatters() {
  const { languageInfo } = useLanguage();
  const locale = languageInfo.code;

  return useMemo(
    () => ({
      locale,
      formatMemberSince: (createdAt: string | undefined) => formatMemberSinceDate(createdAt, locale),
      formatWallet: (wallet: number | null | undefined) => formatWalletBalance(wallet, locale),
    }),
    [locale],
  );
}
