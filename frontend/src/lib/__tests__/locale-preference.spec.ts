/** @jest-environment jsdom */

import {
  LOCALE_COOKIE_KEY,
  LOCALE_STORAGE_KEY,
  readStoredLocaleCode,
  persistClientLocaleCode,
} from '../locale-preference';

describe('locale-preference', () => {
  const memoryStore: Record<string, string> = {};

  beforeEach(() => {
    Object.keys(memoryStore).forEach((k) => delete memoryStore[k]);
    (window.localStorage.getItem as jest.Mock).mockImplementation((key: string) => memoryStore[key] ?? null);
    (window.localStorage.setItem as jest.Mock).mockImplementation((key: string, value: string) => {
      memoryStore[key] = value;
    });
    document.cookie = `${LOCALE_COOKIE_KEY}=; path=/; max-age=0`;
    document.documentElement.removeAttribute('data-aigenius-locale');
    document.documentElement.lang = 'en';
  });

  it('reads locale from localStorage first', () => {
    memoryStore[LOCALE_STORAGE_KEY] = 'de';
    expect(readStoredLocaleCode()).toBe('de');
  });

  it('persists locale to storage, cookie, and html', () => {
    persistClientLocaleCode('fr');
    expect(memoryStore[LOCALE_STORAGE_KEY]).toBe('fr');
    expect(document.cookie).toContain(`${LOCALE_COOKIE_KEY}=fr`);
    expect(document.documentElement.lang).toBe('fr');
    expect(document.documentElement.getAttribute('data-aigenius-locale')).toBe('fr');
  });
});
