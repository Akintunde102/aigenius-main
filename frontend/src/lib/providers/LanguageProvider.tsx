'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  LANGUAGE_CATALOG,
  DEFAULT_LANGUAGE_CODE,
  LanguageCatalogItem,
  resolveLanguageItem,
  getDictionary,
  translate,
  TranslationDictionary,
  TranslationKeyPath,
} from '@/locales';

const STORAGE_KEY = 'aigenius_locale';
const COOKIE_KEY = 'aigenius_locale';

// Singleton for non-React callers (e.g. access-model.ts runtimeContext)
let activeClientLanguageItem: LanguageCatalogItem = resolveLanguageItem(DEFAULT_LANGUAGE_CODE);

export function getActiveClientLanguage(): LanguageCatalogItem {
  if (typeof window !== 'undefined' && (!activeClientLanguageItem || activeClientLanguageItem.code === DEFAULT_LANGUAGE_CODE)) {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        activeClientLanguageItem = resolveLanguageItem(stored);
      }
    } catch {
      // Ignore localStorage access failure
    }
  }
  return activeClientLanguageItem;
}

interface LanguageContextValue {
  language: string;
  languageInfo: LanguageCatalogItem;
  setLanguage: (code: string) => void;
  t: (keyPath: TranslationKeyPath | string, fallback?: string, params?: Record<string, string | number>) => string;
  dictionary: TranslationDictionary;
  catalog: LanguageCatalogItem[];
  isLanguageModalOpen: boolean;
  languageModalVariant: 'app' | 'landing';
  openLanguageModal: (variant?: 'app' | 'landing') => void;
  closeLanguageModal: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<string>(() => {
    if (typeof window === 'undefined') return DEFAULT_LANGUAGE_CODE;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return resolveLanguageItem(stored).code;
      // Check document cookie
      const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_KEY}=([^;]*)`));
      if (match && match[1]) return resolveLanguageItem(decodeURIComponent(match[1])).code;
      // Check navigator language
      if (navigator.language) {
        return resolveLanguageItem(navigator.language).code;
      }
    } catch {
      // Fallback
    }
    return DEFAULT_LANGUAGE_CODE;
  });

  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [languageModalVariant, setLanguageModalVariant] = useState<'app' | 'landing'>('app');

  const languageInfo = useMemo(() => resolveLanguageItem(language), [language]);

  const dictionary = useMemo(() => getDictionary(languageInfo.code), [languageInfo.code]);

  const setLanguage = useCallback((newCode: string) => {
    const item = resolveLanguageItem(newCode);
    setLanguageState(item.code);
    activeClientLanguageItem = item;

    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, item.code);
        document.cookie = `${COOKIE_KEY}=${encodeURIComponent(item.code)}; path=/; max-age=31536000; SameSite=Lax`;
        document.documentElement.lang = item.code;
        // Keep layout LTR. The shell uses physical left/right styles, so dir=rtl
        // mirrors the desktop window instead of just the text.
      } catch {
        // Ignore storage exceptions
      }
    }
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      const item = resolveLanguageItem(event.newValue);
      setLanguageState(item.code);
      activeClientLanguageItem = item;
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  useEffect(() => {
    activeClientLanguageItem = languageInfo;
    if (typeof window !== 'undefined') {
      document.documentElement.lang = languageInfo.code;
      document.documentElement.dir = 'ltr';
    }
  }, [languageInfo]);

  const t = useCallback(
    (keyPath: TranslationKeyPath | string, fallback?: string, params?: Record<string, string | number>) => {
      return translate(languageInfo.code, keyPath, fallback, params);
    },
    [languageInfo.code],
  );

  const openLanguageModal = useCallback((variant: 'app' | 'landing' = 'app') => {
    setLanguageModalVariant(variant);
    setIsLanguageModalOpen(true);
  }, []);
  const closeLanguageModal = useCallback(() => setIsLanguageModalOpen(false), []);

  const value = useMemo<LanguageContextValue>(
    () => ({
      language: languageInfo.code,
      languageInfo,
      setLanguage,
      t,
      dictionary,
      catalog: LANGUAGE_CATALOG,
      isLanguageModalOpen,
      languageModalVariant,
      openLanguageModal,
      closeLanguageModal,
    }),
    [languageInfo, setLanguage, t, dictionary, isLanguageModalOpen, languageModalVariant, openLanguageModal, closeLanguageModal],
  );

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage(): LanguageContextValue {
  const context = useContext(LanguageContext);
  if (!context) {
    const fallbackItem = resolveLanguageItem(DEFAULT_LANGUAGE_CODE);
    return {
      language: fallbackItem.code,
      languageInfo: fallbackItem,
      setLanguage: () => {},
      t: (keyPath, fallback, params) => translate(fallbackItem.code, keyPath, fallback, params),
      dictionary: getDictionary(fallbackItem.code),
      catalog: LANGUAGE_CATALOG,
      isLanguageModalOpen: false,
      languageModalVariant: 'app',
      openLanguageModal: () => {},
      closeLanguageModal: () => {},
    };
  }
  return context;
}
