'use client';

import { useCallback, useEffect, useState } from 'react';
import {
  type AnalyticsConsentChoice,
  isAnalyticsConsentGranted,
  isAnalyticsConsentRequired,
  readAnalyticsConsentChoice,
  subscribeAnalyticsConsentChanges,
  writeAnalyticsConsentChoice,
} from '@/lib/analytics/analytics-consent';

export function useAnalyticsConsent() {
  const [required, setRequired] = useState(false);
  const [choice, setChoice] = useState<AnalyticsConsentChoice | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const sync = () => {
      setRequired(isAnalyticsConsentRequired());
      setChoice(readAnalyticsConsentChoice());
      setHydrated(true);
    };

    sync();
    return subscribeAnalyticsConsentChanges(setChoice);
  }, []);

  const grantConsent = useCallback(() => {
    writeAnalyticsConsentChoice('granted');
    setChoice('granted');
  }, []);

  const denyConsent = useCallback(() => {
    writeAnalyticsConsentChoice('denied');
    setChoice('denied');
  }, []);

  const showBanner = required && hydrated && choice === null;

  const consentGranted = required && isAnalyticsConsentGranted();

  return {
    required,
    choice,
    hydrated,
    showBanner,
    consentGranted,
    grantConsent,
    denyConsent,
  };
}
