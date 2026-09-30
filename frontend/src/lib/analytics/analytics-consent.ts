import { isAnalyticsConsentFeatureEnabled } from '@/lib/analytics/config';

export type AnalyticsConsentChoice = 'granted' | 'denied';

const CONSENT_STORAGE_KEY = 'aigenius_analytics_consent_v1';
export const ANALYTICS_CONSENT_CHANGED_EVENT = 'aigenius:analytics-consent-changed';

export function isAnalyticsConsentRequired(): boolean {
  return isAnalyticsConsentFeatureEnabled();
}

export function readAnalyticsConsentChoice(): AnalyticsConsentChoice | null {
  if (typeof window === 'undefined') {
    return null;
  }

  const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
  if (raw === 'granted' || raw === 'denied') {
    return raw;
  }

  return null;
}

export function isAnalyticsConsentGranted(): boolean {
  if (!isAnalyticsConsentRequired()) {
    return false;
  }

  return readAnalyticsConsentChoice() === 'granted';
}

export function hasAnalyticsConsentDecision(): boolean {
  return readAnalyticsConsentChoice() !== null;
}

export function writeAnalyticsConsentChoice(choice: AnalyticsConsentChoice): void {
  if (typeof window === 'undefined') {
    return;
  }

  window.localStorage.setItem(CONSENT_STORAGE_KEY, choice);
  window.dispatchEvent(new CustomEvent(ANALYTICS_CONSENT_CHANGED_EVENT, { detail: { choice } }));
}

export function subscribeAnalyticsConsentChanges(
  listener: (choice: AnalyticsConsentChoice | null) => void,
): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handler = () => {
    listener(readAnalyticsConsentChoice());
  };

  window.addEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, handler);
  window.addEventListener('storage', handler);

  return () => {
    window.removeEventListener(ANALYTICS_CONSENT_CHANGED_EVENT, handler);
    window.removeEventListener('storage', handler);
  };
}
