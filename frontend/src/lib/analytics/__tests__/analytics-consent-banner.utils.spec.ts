import {
  isAnalyticsConsentBannerHiddenPath,
  shouldShowAnalyticsConsentBanner,
} from '@/lib/analytics/analytics-consent-banner.utils';

describe('analytics-consent-banner.utils', () => {
  it('shows the banner on public marketing routes', () => {
    expect(shouldShowAnalyticsConsentBanner('/login')).toBe(true);
    expect(shouldShowAnalyticsConsentBanner('/docs/privacy-policy')).toBe(true);
    expect(shouldShowAnalyticsConsentBanner('/published-conversations/abc')).toBe(true);
    expect(shouldShowAnalyticsConsentBanner('/h/demo')).toBe(true);
    expect(shouldShowAnalyticsConsentBanner('/payment-callback')).toBe(true);
  });

  it('hides the banner in the authenticated app', () => {
    expect(isAnalyticsConsentBannerHiddenPath('/chat/abc')).toBe(true);
    expect(isAnalyticsConsentBannerHiddenPath('/workflows/new')).toBe(true);
    expect(isAnalyticsConsentBannerHiddenPath('/workflow/123')).toBe(true);
    expect(isAnalyticsConsentBannerHiddenPath('/schedules')).toBe(true);
    expect(isAnalyticsConsentBannerHiddenPath('/notifications')).toBe(true);
    expect(isAnalyticsConsentBannerHiddenPath('/config')).toBe(true);
  });

  it('treats root as marketing only when logged out', () => {
    expect(shouldShowAnalyticsConsentBanner('/', { isAuthenticated: false })).toBe(true);
    expect(isAnalyticsConsentBannerHiddenPath('/', { isAuthenticated: true })).toBe(true);
  });

  it('shows the banner only on desktop onboarding routes', () => {
    expect(shouldShowAnalyticsConsentBanner('/desktop-login', { isDesktop: true })).toBe(true);
    expect(shouldShowAnalyticsConsentBanner('/desktop-welcome', { isDesktop: true })).toBe(true);
    expect(isAnalyticsConsentBannerHiddenPath('/', { isDesktop: true })).toBe(true);
    expect(isAnalyticsConsentBannerHiddenPath('/chat/abc', { isDesktop: true })).toBe(true);
  });
});
