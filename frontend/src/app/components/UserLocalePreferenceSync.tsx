'use client';

import { useEffect, useRef } from 'react';
import { useLanguage } from '@/lib/providers/LanguageProvider';
import { hasExplicitStoredLocale } from '@/lib/locale-preference';
import { fetchUserChatPreferences } from '@/lib/calls/user-locale-preference';
import { resolveLanguageItem } from '@/locales';

/**
 * When the user has no local locale yet, apply server-stored preferredLocale after sign-in.
 */
export function UserLocalePreferenceSync() {
  const { setLanguage } = useLanguage();
  const appliedRef = useRef(false);

  useEffect(() => {
    if (appliedRef.current || hasExplicitStoredLocale()) {
      return;
    }

    let cancelled = false;
    void (async () => {
      const prefs = await fetchUserChatPreferences();
      if (cancelled || appliedRef.current || hasExplicitStoredLocale()) {
        return;
      }
      const raw = prefs?.preferredLocale;
      if (typeof raw !== 'string' || !raw.trim()) {
        return;
      }
      appliedRef.current = true;
      setLanguage(resolveLanguageItem(raw.trim()).code);
    })();

    return () => {
      cancelled = true;
    };
  }, [setLanguage]);

  return null;
}
