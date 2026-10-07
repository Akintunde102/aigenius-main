import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiSearch, FiCheck } from 'react-icons/fi';
import { useLanguage } from '@/lib/providers/LanguageProvider';
import { hasUiDictionary, LanguageCatalogItem, translate } from '@/locales';
import { DISPLAY } from '@/app/components/landing/typography';
import toast from 'react-hot-toast';

/*
 * Colours are plain stone and translucent black/white, the same approach as the landing page's Modal,
 * so the dialog resolves in the portal and follows light and dark mode. The old --sidebar-* variables
 * and the sky-blue accent are gone.
 */
const ROW_BASE = 'group flex items-center justify-between text-left transition-colors duration-150';
const ROW_IDLE = 'hover:bg-stone-900/[0.05] dark:hover:bg-white/[0.07]';
const ROW_SELECTED = 'bg-stone-900/[0.07] font-medium dark:bg-white/[0.1]';
const MUTED = 'text-stone-500 dark:text-stone-400';

export function LanguageSelectionModalLanding() {
  const {
    language,
    languageInfo,
    setLanguage,
    catalog,
    t,
    isLanguageModalOpen,
    closeLanguageModal,
  } = useLanguage();

  const [search, setSearch] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);

  // Focus search input when modal opens
  useEffect(() => {
    if (isLanguageModalOpen) {
      setSearch('');
      const timer = setTimeout(() => {
        searchInputRef.current?.focus();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [isLanguageModalOpen]);

  // Handle ESC key
  useEffect(() => {
    if (!isLanguageModalOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        closeLanguageModal();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [isLanguageModalOpen, closeLanguageModal]);

  const filteredCatalog = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return catalog;
    return catalog.filter(
      (item) =>
        item.name.toLowerCase().includes(q) ||
        item.nativeName.toLowerCase().includes(q) ||
        item.code.toLowerCase().includes(q),
    );
  }, [catalog, search]);

  const popularLanguages = useMemo(() => {
    return catalog.filter((item) => item.popular);
  }, [catalog]);

  const coverageBadge = (code: string) => {
    const translated = hasUiDictionary(code);
    return (
      <span
        className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] ${
          translated
            ? 'bg-stone-900/[0.08] text-stone-700 dark:bg-white/[0.12] dark:text-stone-200'
            : 'bg-stone-900/[0.04] text-stone-500 dark:bg-white/[0.06] dark:text-stone-400'
        }`}
      >
        {translated
          ? t('languageModal.interfaceBadge', 'Interface')
          : t('languageModal.assistantOnlyBadge', 'Assistant')}
      </span>
    );
  };

  const handleSelect = (item: LanguageCatalogItem) => {
    if (item.code !== language) {
      setLanguage(item.code);
      toast.success(
        translate(item.code, 'languageModal.changedToast', 'Language changed to {name}', {
          name: item.nativeName,
        }),
        { duration: 2500 },
      );
    }
    closeLanguageModal();
  };

  if (!isLanguageModalOpen || typeof document === 'undefined') {
    return null;
  }

  const modalContent = (
    <div
      role="presentation"
      className="fixed inset-0 z-[10002] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fadeIn"
      onClick={closeLanguageModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="language-modal-title"
        className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-3xl bg-stone-50 text-stone-900 shadow-2xl dark:bg-stone-800 dark:text-stone-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between gap-4 px-7 pb-3 pt-7">
          <div>
            <h2
              id="language-modal-title"
              className={`${DISPLAY} text-2xl font-normal leading-[1.1] tracking-[-0.02em]`}
            >
              {t('languageModal.title', 'Select Language')}
            </h2>
            <p className={`mt-2 max-w-md text-sm leading-relaxed ${MUTED}`}>
              {t(
                'languageModal.subtitle',
                'Choose your interface language. The assistant will also converse in this language by default.',
              )}
            </p>
          </div>
          <button
            type="button"
            onClick={closeLanguageModal}
            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-[background-color,transform] duration-150 ease-out active:scale-[0.97] hover:bg-stone-900/[0.07] dark:hover:bg-white/[0.1] focus:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/40 dark:focus-visible:ring-white/50 ${MUTED}`}
            aria-label={t('common.close', 'Close')}
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="px-7 py-3">
          <div className="relative flex items-center">
            <FiSearch size={16} className={`absolute left-4 ${MUTED}`} />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(
                'languageModal.searchPlaceholder',
                'Search by language name, native name, or code...',
              )}
              className="w-full rounded-full bg-stone-900/[0.05] py-3 pl-11 pr-10 text-sm text-stone-900 placeholder:text-stone-400 transition-shadow duration-150 focus:outline-none focus:ring-2 focus:ring-stone-900/25 dark:bg-white/[0.08] dark:text-stone-100 dark:placeholder:text-stone-500 dark:focus:ring-white/30"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className={`absolute right-3.5 flex h-5 w-5 items-center justify-center rounded-full hover:text-stone-900 dark:hover:text-stone-100 ${MUTED}`}
                aria-label={t('common.clear', 'Clear')}
              >
                <FiX size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Languages List */}
        <div className="flex-1 overflow-y-auto px-5 pb-4 pt-2 custom-scrollbar">
          {search.trim().length === 0 ? (
            <>
              {/* Popular Languages Section */}
              <div className="mb-6">
                <h3 className={`mb-2 px-2 text-sm font-medium ${MUTED}`}>
                  {t('languageModal.popularLanguages', 'Popular Languages')}
                </h3>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {popularLanguages.map((item) => {
                    const isSelected = language.toLowerCase() === item.code.toLowerCase();
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => handleSelect(item)}
                        className={`${ROW_BASE} rounded-xl px-3.5 py-2.5 ${isSelected ? ROW_SELECTED : ROW_IDLE}`}
                      >
                        <div className="flex min-w-0 flex-col">
                          <span className="flex min-w-0 items-center gap-1.5">
                            <span className="truncate text-sm font-semibold">{item.nativeName}</span>
                            {coverageBadge(item.code)}
                          </span>
                          <span className={`truncate text-xs ${MUTED}`}>{item.name}</span>
                        </div>
                        {isSelected && <FiCheck size={16} strokeWidth={2.5} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* All Languages Directory */}
              <div>
                <h3 className={`mb-2 px-2 text-sm font-medium ${MUTED}`}>
                  {t('languageModal.allLanguages', 'All Languages')}
                </h3>
                <div className="grid grid-cols-1 gap-0.5 sm:grid-cols-2">
                  {catalog.map((item) => {
                    const isSelected = language.toLowerCase() === item.code.toLowerCase();
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => handleSelect(item)}
                        className={`${ROW_BASE} rounded-lg px-3 py-2 ${isSelected ? ROW_SELECTED : ROW_IDLE}`}
                      >
                        <div className="flex min-w-0 items-center gap-2">
                          <span className={`w-8 shrink-0 font-mono text-xs font-medium ${MUTED}`}>{item.code}</span>
                          <span className="truncate text-sm">{item.nativeName}</span>
                          {coverageBadge(item.code)}
                          <span className={`truncate text-xs ${MUTED}`}>({item.name})</span>
                        </div>
                        {isSelected && <FiCheck size={15} strokeWidth={2.5} className="ml-2 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          ) : (
            /* Search Results */
            <div>
              {filteredCatalog.length === 0 ? (
                <div className={`py-12 text-center text-sm ${MUTED}`}>
                  {t('languageModal.noLanguagesFound', 'No languages found matching your search')}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {filteredCatalog.map((item) => {
                    const isSelected = language.toLowerCase() === item.code.toLowerCase();
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => handleSelect(item)}
                        className={`${ROW_BASE} rounded-xl px-3.5 py-2.5 ${isSelected ? ROW_SELECTED : ROW_IDLE}`}
                      >
                        <div className="flex min-w-0 flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="truncate text-sm font-semibold">{item.nativeName}</span>
                            {coverageBadge(item.code)}
                            <span className={`font-mono text-[11px] ${MUTED}`}>[{item.code}]</span>
                          </div>
                          <span className={`truncate text-xs ${MUTED}`}>{item.name}</span>
                        </div>
                        {isSelected && <FiCheck size={16} strokeWidth={2.5} className="shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className={`flex items-center justify-between gap-4 px-7 pb-6 pt-3 text-xs ${MUTED}`}>
          <div className="flex min-w-0 items-center gap-1.5">
            <span>{t('languageModal.currentLanguageBadge', 'Current')}:</span>
            <span className="truncate font-medium text-stone-900 dark:text-stone-100">
              {languageInfo.name} ({languageInfo.nativeName})
            </span>
          </div>
          <button
            type="button"
            onClick={closeLanguageModal}
            className="inline-flex h-9 shrink-0 items-center rounded-full bg-stone-900/[0.07] px-5 text-sm font-medium text-stone-900 transition-[background-color,transform] duration-150 ease-out hover:bg-stone-900/[0.12] active:scale-[0.97] dark:bg-white/[0.1] dark:text-stone-100 dark:hover:bg-white/[0.16]"
          >
            {t('common.close', 'Close')}
          </button>
        </div>
      </div>
    </div>
  );

  const target = document.getElementById('modal-root') ?? document.body;
  return createPortal(modalContent, target);
}
