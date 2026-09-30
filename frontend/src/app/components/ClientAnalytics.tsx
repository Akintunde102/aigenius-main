"use client";

import { Analytics } from "@vercel/analytics/react";
import { useEffect, useState } from "react";
import { getPostHogClient } from "@/lib/analytics/posthog-client";
import { useAnalyticsIdentity } from "@/lib/analytics/useAnalyticsIdentity";
import { useAnalyticsConsent } from "@/lib/analytics/useAnalyticsConsent";
import AnalyticsConsentBanner from "@/app/components/AnalyticsConsentBanner";

/**
 * Product analytics bootstrap:
 * - PostHog (including session replay) when analytics is enabled **and** the user accepts the consent banner
 * - Vercel Analytics on web only, also gated by consent
 * - Cookie banner is path-aware: public/marketing routes only (see analytics-consent-banner.utils.ts)
 */
export default function ClientAnalytics() {
  const { consentGranted, hydrated } = useAnalyticsConsent();
  const [vercelEnabled, setVercelEnabled] = useState(false);

  useAnalyticsIdentity();

  useEffect(() => {
    if (!hydrated || !consentGranted) {
      setVercelEnabled(false);
      return;
    }

    getPostHogClient();
    setVercelEnabled(!/\bElectron\/\d/i.test(navigator.userAgent || ""));
  }, [consentGranted, hydrated]);

  return (
    <>
      <AnalyticsConsentBanner />
      {vercelEnabled ? <Analytics /> : null}
    </>
  );
}
