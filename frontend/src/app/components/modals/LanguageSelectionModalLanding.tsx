'use client';

import React, { useState, useMemo, useEffect, useRef } from 'react';
import { FiCheck, FiGlobe } from 'react-icons/fi';
import { useLanguage } from '@/lib/providers/LanguageProvider';
import { hasUiDictionary, LanguageCatalogItem, translate } from '@/locales';
import toast from 'react-hot-toast';
import { AppModal, AppModalBody, AppModalHeader, AppModalSearchRow } from '@/app/components/modals/AppModal';

export function LanguageSelectionModalLanding() {
  const {
    language,
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
        className={`shrink-0 rounded px-1.5 py-0.5 text-[9px] font-semibold uppercase tracking-wider ${
          translated
            ? 'bg-[color-mix(in_srgb,var(--chat-accent)_15%,transparent)] text-[var(--chat-accent)]'
            : 'bg-[color-mix(in_srgb,var(--modal-fg)_6%,transparent)] text-[var(--modal-muted-fg)]'
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

  const renderLanguageItem = (item: LanguageCatalogItem) => {
    const isSelected = language.toLowerCase() === item.code.toLowerCase();
    return (
      <button
        key={item.code}
        type="button"
        onClick={() => handleSelect(item)}
        className={`group flex items-center justify-between rounded-xl px-3 py-2 text-left transition-all ${
          isSelected
            ? 'border border-[var(--chat-accent)] bg-[color-mix(in_srgb,var(--chat-accent)_12%,var(--modal-bg))] text-[var(--chat-accent)] font-medium shadow-xs'
            : 'border border-[var(--modal-border)] bg-[var(--modal-bg)] hover:bg-[color-mix(in_srgb,var(--modal-fg)_5%,transparent)] text-[var(--modal-fg)]'
        }`}
      >
        <div className="flex flex-col min-w-0">
          <span className="flex items-center gap-1.5 min-w-0">
            <span className="text-xs font-semibold truncate">
              {item.nativeName}
            </span>
            {coverageBadge(item.code)}
          </span>
          <span className="text-[11px] text-[var(--modal-muted-fg)] truncate">
            {item.name}
          </span>
        </div>
        {isSelected && (
          <FiCheck size={14} strokeWidth={2.5} className="shrink-0 text-[var(--chat-accent)]" />
        )}
      </button>
    );
  };

  return (
    <AppModal
      open={isLanguageModalOpen}
      onClose={closeLanguageModal}
      size="lg"
      ariaLabelledBy="language-landing-modal-title"
      panelClassName="flex h-[min(85vh,680px)] max-h-[min(90vh,760px)] max-w-2xl flex-col overflow-hidden p-0"
    >
      <AppModalHeader
        titleId="language-landing-modal-title"
        title={t('languageModal.title', 'Select Language')}
        subtitle={t(
          'languageModal.subtitle',
          'Choose your interface language. The assistant will also converse in this language by default.',
        )}
        onClose={closeLanguageModal}
      />

      <AppModalSearchRow
        value={search}
        onChange={setSearch}
        inputRef={searchInputRef}
        placeholder={t(
          'languageModal.searchPlaceholder',
          'Search by language name, native name, or code...',
        )}
      />

      {/* Languages List */}
      <AppModalBody className="flex-1 overflow-y-auto px-4 py-3 custom-scrollbar">
        {search.trim().length === 0 ? (
          <div className="space-y-3.5">
            {/* Popular Languages Section */}
            <div>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--modal-muted-fg)]">
                {t('languageModal.popularLanguages', 'Popular Languages')}
              </h3>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {popularLanguages.map(renderLanguageItem)}
              </div>
            </div>

            {/* All Languages Section */}
            <div>
              <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--modal-muted-fg)]">
                {t('languageModal.allLanguages', 'All Languages')} ({catalog.length})
              </h3>
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {catalog.map(renderLanguageItem)}
              </div>
            </div>
          </div>
        ) : (
          <div>
            <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-[var(--modal-muted-fg)]">
              {t('languageModal.searchResults', 'Search Results')} ({filteredCatalog.length})
            </h3>
            {filteredCatalog.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-center text-sm text-[var(--modal-muted-fg)]">
                <FiGlobe size={24} className="mb-2 opacity-40" />
                <p className="text-xs">{t('languageModal.noResults', 'No languages match your search.')}</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                {filteredCatalog.map(renderLanguageItem)}
              </div>
            )}
          </div>
        )}
      </AppModalBody>
    </AppModal>
  );
}
