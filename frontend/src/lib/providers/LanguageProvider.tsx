'use client';

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react';
import {
  LANGUAGE_CATALOG,
  DEFAULT_LANGUAGE_CODE,
  LanguageCatalogItem,
  resolveLanguageItem,
  getDictionary,
  translate,
  ensureDictionaryLoaded,
  TranslationDictionary,
  TranslationKeyPath,
} from '@/locales';
import {
  readStoredLocaleCode,
  persistClientLocaleCode,
} from '@/lib/locale-preference';
import { patchUserPreferredLocale } from '@/lib/calls/user-locale-preference';

// Singleton for non-React callers (e.g. access-model.ts runtimeContext)
let activeClientLanguageItem: LanguageCatalogItem = resolveLanguageItem(DEFAULT_LANGUAGE_CODE);

export function getActiveClientLanguage(): LanguageCatalogItem {
  if (typeof window !== 'undefined') {
    const stored = readStoredLocaleCode();
    if (stored) {
      activeClientLanguageItem = resolveLanguageItem(stored);
    }
  }
  return activeClientLanguageItem;
}

function resolveInitialLanguageCode(): string {
  if (typeof window === 'undefined') return DEFAULT_LANGUAGE_CODE;
  try {
    const stored = readStoredLocaleCode();
    if (stored) return resolveLanguageItem(stored).code;
    if (navigator.language) {
      return resolveLanguageItem(navigator.language).code;
    }
  } catch {
    // Fallback
  }
  return DEFAULT_LANGUAGE_CODE;
}

interface LanguageContextValue {
  language: string;
  languageInfo: LanguageCatalogItem;
  setLanguage: (code: string) => void;
  t: (keyPath: TranslationKeyPath | string, fallback?: string, params?: Record<string, string | number>) => string;
  dictionary: TranslationDictionary;
  dictionaryReady: boolean;
  catalog: LanguageCatalogItem[];
  isLanguageModalOpen: boolean;
  languageModalVariant: 'app' | 'landing';
  openLanguageModal: (variant?: 'app' | 'landing') => void;
  closeLanguageModal: () => void;
}

const LanguageContext = createContext<LanguageContextValue | null>(null);

export function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [language, setLanguageState] = useState<string>(resolveInitialLanguageCode);
  const [dictionaryEpoch, setDictionaryEpoch] = useState(0);
  const [dictionaryReady, setDictionaryReady] = useState(() => {
    const code = resolveInitialLanguageCode();
    return code === DEFAULT_LANGUAGE_CODE || code.startsWith('en');
  });

  const [isLanguageModalOpen, setIsLanguageModalOpen] = useState(false);
  const [languageModalVariant, setLanguageModalVariant] = useState<'app' | 'landing'>('app');

  const languageInfo = useMemo(() => resolveLanguageItem(language), [language]);

  const dictionary = useMemo(
    () => getDictionary(languageInfo.code),
    [languageInfo.code, dictionaryEpoch],
  );

  useEffect(() => {
    let cancelled = false;
    setDictionaryReady(languageInfo.code === DEFAULT_LANGUAGE_CODE || languageInfo.code.startsWith('en'));

    void ensureDictionaryLoaded(languageInfo.code).then(() => {
      if (!cancelled) {
        setDictionaryEpoch((n) => n + 1);
        setDictionaryReady(true);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [languageInfo.code]);

  const setLanguage = useCallback((newCode: string) => {
    const item = resolveLanguageItem(newCode);
    setLanguageState(item.code);
    activeClientLanguageItem = item;
    persistClientLocaleCode(item.code);

    void patchUserPreferredLocale(item.code).catch(() => {
      /* unauthenticated or offline */
    });
  }, []);

  useEffect(() => {
    const onStorage = (event: StorageEvent) => {
      if (event.key !== 'aigenius_locale' || !event.newValue) return;
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
    [languageInfo.code, dictionaryEpoch],
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
      dictionaryReady,
      catalog: LANGUAGE_CATALOG,
      isLanguageModalOpen,
      languageModalVariant,
      openLanguageModal,
      closeLanguageModal,
    }),
    [
      languageInfo,
      setLanguage,
      t,
      dictionary,
      dictionaryReady,
      isLanguageModalOpen,
      languageModalVariant,
      openLanguageModal,
      closeLanguageModal,
    ],
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
      dictionaryReady: true,
      catalog: LANGUAGE_CATALOG,
      isLanguageModalOpen: false,
      languageModalVariant: 'app',
      openLanguageModal: () => {},
      closeLanguageModal: () => {},
    };
  }
  return context;
}
