'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { FiSearch, FiX } from 'react-icons/fi';
import { useLanguage } from '@/lib/providers/LanguageProvider';
import { MODAL_ELEVATED_Z_INDEX } from '@/lib/utils/modal-z-index';

export type AppModalSize = 'sm' | 'md' | 'lg' | 'xl' | 'tall';

const PANEL_SIZE_CLASS: Record<AppModalSize, string> = {
  sm: 'max-w-md',
  md: 'max-w-lg',
  lg: 'max-w-2xl sm:max-w-3xl',
  xl: 'max-w-4xl',
  tall: 'h-[min(85vh,720px)] max-h-[min(90vh,900px)] max-w-2xl sm:max-w-3xl',
};

export function useAppModalEscape(onClose: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.preventDefault();
      e.stopPropagation();
      onClose();
    };
    window.addEventListener('keydown', onKeyDown, true);
    return () => window.removeEventListener('keydown', onKeyDown, true);
  }, [onClose, enabled]);
}

export function AppModalCloseButton({
  onClose,
  className = '',
  title,
}: {
  onClose: () => void;
  className?: string;
  title?: string;
}) {
  const { t } = useLanguage();
  return (
    <button
      type="button"
      className={`app-modal-close-btn ${className}`.trim()}
      onClick={onClose}
      aria-label={title ?? t('common.close', 'Close')}
    >
      <FiX size={15} strokeWidth={2} />
    </button>
  );
}

export function AppModalHeader({
  title,
  subtitle,
  titleId,
  onClose,
  trailing,
  className = '',
  withBorder = false,
}: {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  titleId?: string;
  onClose: () => void;
  trailing?: React.ReactNode;
  className?: string;
  withBorder?: boolean;
}) {
  return (
    <div className={`app-modal-panel-header ${withBorder ? 'app-modal-panel-header--bordered' : ''} ${className}`.trim()}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h2 id={titleId} className="app-modal-title">
            {title}
          </h2>
          {subtitle ? <p className="app-modal-subtitle">{subtitle}</p> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5 -mr-1 -mt-0.5">
          {trailing}
          <AppModalCloseButton onClose={onClose} />
        </div>
      </div>
    </div>
  );
}

export function AppModalSearchRow({
  value,
  onChange,
  placeholder,
  autoFocus,
  inputRef,
  'aria-label': ariaLabel,
}: {
  value: string;
  onChange: (value: string) => void;
  placeholder: string;
  autoFocus?: boolean;
  inputRef?: React.RefObject<HTMLInputElement | null>;
  'aria-label'?: string;
}) {
  const { t } = useLanguage();
  return (
    <div className="app-modal-search-row">
      <div className="relative flex items-center">
        <FiSearch
          size={14}
          className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2"
          style={{ color: 'var(--modal-muted-fg)' }}
        />
        <input
          ref={inputRef as React.Ref<HTMLInputElement> | undefined}
          type="search"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          autoFocus={autoFocus}
          aria-label={ariaLabel ?? placeholder}
          className="app-modal-input h-8 rounded-lg pl-8 pr-8 text-xs"
        />
        {value ? (
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-0.5 transition-colors hover:bg-black/5 dark:hover:bg-white/10"
            style={{ color: 'var(--modal-muted-fg)' }}
            aria-label={t('common.clear', 'Clear')}
          >
            <FiX size={12} />
          </button>
        ) : null}
      </div>
    </div>
  );
}

export function AppModalBody({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <div className={`app-modal-panel-body ${className}`.trim()}>{children}</div>;
}

export function AppModalTabs({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return (
    <div
      className={`app-modal-tabs -mx-5 mb-3 flex shrink-0 border-b px-5 ${className}`.trim()}
      style={{ borderColor: 'var(--modal-border)' }}
    >
      {children}
    </div>
  );
}

export function AppModalFooter({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={`app-modal-footer ${className}`.trim()}>
      {children}
    </div>
  );
}

export type AppModalProps = {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
  size?: AppModalSize;
  /** Dialog title id for aria-labelledby when header is custom */
  ariaLabelledBy?: string;
  className?: string;
  panelClassName?: string;
  mobileFullScreen?: boolean;
  closeOnOverlayClick?: boolean;
  /** When false, parent handles Escape (e.g. nested lightbox). */
  closeOnEscape?: boolean;
  /** Stack above other modals (confirm sheets, nested dialogs). */
  elevated?: boolean;
};

export function AppModal({
  open,
  onClose,
  children,
  size = 'md',
  ariaLabelledBy,
  className = '',
  panelClassName = '',
  mobileFullScreen = false,
  closeOnOverlayClick = true,
  closeOnEscape = true,
  elevated = false,
}: AppModalProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useAppModalEscape(onClose, open && closeOnEscape);

  const handleOverlayClick = useCallback(() => {
    if (closeOnOverlayClick) onClose();
  }, [closeOnOverlayClick, onClose]);

  if (!open || !mounted || typeof document === 'undefined') {
    return null;
  }

  const portalTarget = document.getElementById('modal-root') ?? document.body;

  const overlay = (
    <div
      role="presentation"
      className={`app-modal-overlay backdrop-blur-sm ${mobileFullScreen ? 'p-0' : ''} ${className}`.trim()}
      style={elevated ? { zIndex: MODAL_ELEVATED_Z_INDEX } : undefined}
      onClick={handleOverlayClick}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={ariaLabelledBy}
        className={`app-modal-panel app-modal-panel--shell shadow-2xl ${PANEL_SIZE_CLASS[size]} ${
          mobileFullScreen ? 'h-full max-h-none rounded-none border-0' : ''
        } ${panelClassName}`.trim()}
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );

  return createPortal(overlay, portalTarget);
}
