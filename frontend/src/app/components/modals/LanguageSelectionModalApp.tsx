'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiX, FiSearch, FiCheck, FiGlobe } from 'react-icons/fi';
import { useLanguage } from '@/lib/providers/LanguageProvider';
import { hasUiDictionary, LanguageCatalogItem, translate } from '@/locales';
import toast from 'react-hot-toast';

export function LanguageSelectionModalApp() {
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
        className={`shrink-0 rounded px-1 py-0.5 text-[9px] font-semibold uppercase tracking-wide ${
          translated
            ? 'bg-sky-500/15 text-sky-300'
            : 'bg-white/5 text-[var(--sidebar-muted-fg,#94a3b8)]'
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
      className="fixed inset-0 z-[10002] flex items-center justify-center bg-slate-950/60 p-4 backdrop-blur-[4px] animate-fadeIn"
      onClick={closeLanguageModal}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="language-modal-title"
        className="flex max-h-[85vh] w-full max-w-xl flex-col rounded-2xl border border-[var(--sidebar-border)] bg-[var(--sidebar-menu-bg,#1e293b)] text-[var(--sidebar-fg,#f8fafc)] shadow-2xl transition-all"
        style={{
          backgroundColor: 'var(--sidebar-menu-bg, #182234)',
          borderColor: 'var(--sidebar-border, #334155)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-[var(--sidebar-border,#334155)] px-6 py-5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400">
              <FiGlobe size={20} strokeWidth={2} />
            </div>
            <div>
              <h2
                id="language-modal-title"
                className="text-lg font-semibold tracking-tight text-[var(--sidebar-fg,#f8fafc)]"
              >
                {t('languageModal.title', 'Select Language')}
              </h2>
              <p className="mt-0.5 text-xs text-[var(--sidebar-muted-fg,#94a3b8)]">
                {t(
                  'languageModal.subtitle',
                  'Choose your interface language. The assistant will also converse in this language by default.',
                )}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={closeLanguageModal}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-[var(--sidebar-muted-fg,#94a3b8)] transition-colors hover:bg-[var(--sidebar-menu-row-hover,#2d3748)] hover:text-[var(--sidebar-fg,#f8fafc)] focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500"
            aria-label={t('common.close', 'Close')}
          >
            <FiX size={18} />
          </button>
        </div>

        {/* Search Bar */}
        <div className="border-b border-[var(--sidebar-border,#334155)] px-6 py-3.5">
          <div className="relative flex items-center">
            <FiSearch
              size={16}
              className="absolute left-3.5 text-[var(--sidebar-muted-fg,#94a3b8)]"
            />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(
                'languageModal.searchPlaceholder',
                'Search by language name, native name, or code...',
              )}
              className="w-full rounded-xl border border-[var(--sidebar-border,#334155)] bg-[var(--sidebar-bg,#0f172a)] py-2.5 pl-10 pr-9 text-sm text-[var(--sidebar-fg,#f8fafc)] placeholder-[var(--sidebar-muted-fg,#94a3b8)] transition-colors focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch('')}
                className="absolute right-3 flex h-5 w-5 items-center justify-center rounded-full text-[var(--sidebar-muted-fg,#94a3b8)] hover:text-[var(--sidebar-fg,#f8fafc)]"
                aria-label={t('common.clear', 'Clear')}
              >
                <FiX size={13} />
              </button>
            )}
          </div>
        </div>

        {/* Languages List */}
        <div className="flex-1 overflow-y-auto px-6 py-4 custom-scrollbar">
          {search.trim().length === 0 ? (
            <>
              {/* Popular Languages Section */}
              <div className="mb-6">
                <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--sidebar-muted-fg,#94a3b8)]">
                  {t('languageModal.popularLanguages', 'Popular Languages')}
                </h3>
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {popularLanguages.map((item) => {
                    const isSelected = language.toLowerCase() === item.code.toLowerCase();
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => handleSelect(item)}
                        className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition-all ${
                          isSelected
                            ? 'bg-sky-500/15 border border-sky-500/40 text-sky-400 font-medium'
                            : 'border border-transparent hover:bg-[var(--sidebar-menu-row-hover,#2d3748)] text-[var(--sidebar-fg,#f8fafc)]'
                        }`}
                      >
                        <div className="flex flex-col min-w-0">
                          <span className="flex items-center gap-1.5 min-w-0">
                            <span className="text-sm font-semibold truncate">
                              {item.nativeName}
                            </span>
                            {coverageBadge(item.code)}
                          </span>
                          <span className="text-xs text-[var(--sidebar-muted-fg,#94a3b8)] group-hover:text-[var(--sidebar-fg,#f8fafc)] truncate">
                            {item.name}
                          </span>
                        </div>
                        {isSelected && (
                          <FiCheck size={16} strokeWidth={2.5} className="shrink-0 text-sky-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* All Languages Directory */}
              <div>
                <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wider text-[var(--sidebar-muted-fg,#94a3b8)]">
                  {t('languageModal.allLanguages', 'All Languages')}
                </h3>
                <div className="grid grid-cols-1 gap-1 sm:grid-cols-2">
                  {catalog.map((item) => {
                    const isSelected = language.toLowerCase() === item.code.toLowerCase();
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => handleSelect(item)}
                        className={`group flex items-center justify-between rounded-lg px-3 py-2 text-left transition-all ${
                          isSelected
                            ? 'bg-sky-500/15 text-sky-400 font-medium'
                            : 'hover:bg-[var(--sidebar-menu-row-hover,#2d3748)] text-[var(--sidebar-fg,#f8fafc)]'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="text-xs font-medium text-[var(--sidebar-muted-fg,#94a3b8)] w-8 font-mono shrink-0">
                            {item.code}
                          </span>
                          <span className="text-sm truncate">{item.nativeName}</span>
                          {coverageBadge(item.code)}
                          <span className="text-xs text-[var(--sidebar-muted-fg,#94a3b8)] truncate">
                            ({item.name})
                          </span>
                        </div>
                        {isSelected && (
                          <FiCheck size={15} strokeWidth={2.5} className="shrink-0 text-sky-400 ml-2" />
                        )}
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
                <div className="py-12 text-center text-sm text-[var(--sidebar-muted-fg,#94a3b8)]">
                  {t(
                    'languageModal.noLanguagesFound',
                    'No languages found matching your search',
                  )}
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {filteredCatalog.map((item) => {
                    const isSelected = language.toLowerCase() === item.code.toLowerCase();
                    return (
                      <button
                        key={item.code}
                        type="button"
                        onClick={() => handleSelect(item)}
                        className={`group flex items-center justify-between rounded-xl px-3.5 py-2.5 text-left transition-all ${
                          isSelected
                            ? 'bg-sky-500/15 border border-sky-500/40 text-sky-400 font-medium'
                            : 'border border-transparent hover:bg-[var(--sidebar-menu-row-hover,#2d3748)] text-[var(--sidebar-fg,#f8fafc)]'
                        }`}
                      >
                        <div className="flex flex-col min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-sm font-semibold truncate">
                              {item.nativeName}
                            </span>
                            {coverageBadge(item.code)}
                            <span className="text-[11px] font-mono text-[var(--sidebar-muted-fg,#94a3b8)]">
                              [{item.code}]
                            </span>
                          </div>
                          <span className="text-xs text-[var(--sidebar-muted-fg,#94a3b8)] group-hover:text-[var(--sidebar-fg,#f8fafc)] truncate">
                            {item.name}
                          </span>
                        </div>
                        {isSelected && (
                          <FiCheck size={16} strokeWidth={2.5} className="shrink-0 text-sky-400" />
                        )}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between border-t border-[var(--sidebar-border,#334155)] px-6 py-3.5 text-xs text-[var(--sidebar-muted-fg,#94a3b8)]">
          <div className="flex items-center gap-1.5">
            <span>{t('languageModal.currentLanguageBadge', 'Current')}:</span>
            <span className="font-semibold text-sky-400">
              {languageInfo.name} ({languageInfo.nativeName})
            </span>
          </div>
          <button
            type="button"
            onClick={closeLanguageModal}
            className="rounded-lg border border-[var(--sidebar-border,#334155)] px-3.5 py-1.5 text-xs font-medium text-[var(--sidebar-fg,#f8fafc)] transition-colors hover:bg-[var(--sidebar-menu-row-hover,#2d3748)]"
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
