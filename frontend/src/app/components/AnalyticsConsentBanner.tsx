'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { shouldShowAnalyticsConsentBanner } from '@/lib/analytics/analytics-consent-banner.utils';
import { useAnalyticsConsent } from '@/lib/analytics/useAnalyticsConsent';
import { useAuthenticatedSessionSnapshot } from '@/lib/analytics/useAuthenticatedSessionSnapshot';
import { isAigeniusDesktopRuntime } from '@/lib/utils/desktop-runtime';

export default function AnalyticsConsentBanner() {
  const pathname = usePathname();
  const isAuthenticated = useAuthenticatedSessionSnapshot();
  const { showBanner, grantConsent, denyConsent } = useAnalyticsConsent();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const visibleOnPath = shouldShowAnalyticsConsentBanner(pathname, {
    isAuthenticated,
    isDesktop: isAigeniusDesktopRuntime(),
  });

  if (!showBanner || !mounted || !visibleOnPath) {
    return null;
  }

  return createPortal(
    <div
      className="fixed inset-x-0 bottom-0 z-[200] border-t backdrop-blur-md"
      style={{
        background: 'color-mix(in srgb, var(--modal-bg) 92%, transparent)',
        borderColor: 'var(--modal-border)',
      }}
      role="dialog"
      aria-live="polite"
      aria-label="Cookie consent"
    >
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:gap-6 sm:px-6 sm:py-3.5">
        <p
          className="text-[13px] leading-relaxed sm:text-sm"
          style={{ color: 'var(--modal-muted-fg)' }}
        >
          We use cookies for analytics and session replay to improve AIGenius.{' '}
          <Link
            href="/docs/privacy-policy#cookies"
            className="underline underline-offset-2 transition-opacity hover:opacity-80"
            style={{ color: 'var(--modal-fg)' }}
          >
            See our privacy policy
          </Link>{' '}
          for details.
        </p>

        <div className="flex shrink-0 items-center gap-2 sm:gap-3">
          <button
            type="button"
            onClick={denyConsent}
            className="rounded-lg px-3 py-2 text-[13px] font-medium transition-opacity hover:opacity-70 sm:text-sm"
            style={{ color: 'var(--modal-muted-fg)' }}
          >
            Decline
          </button>
          <button
            type="button"
            onClick={grantConsent}
            className="rounded-lg bg-orange-500 px-4 py-2 text-[13px] font-semibold text-white transition-colors hover:bg-orange-400 sm:text-sm"
          >
            Accept
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
