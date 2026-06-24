'use client';

import React from 'react';
import {
  Code2,
  ExternalLink,
  Eye,
  PanelLeft,
  Save,
  X,
} from 'lucide-react';

function ToolbarButton({
  onClick,
  title,
  active,
  disabled,
  children,
  accent,
}: {
  onClick: () => void;
  title: string;
  active?: boolean;
  disabled?: boolean;
  children: React.ReactNode;
  accent?: 'save' | 'default';
}) {
  const base =
    'inline-flex h-8 w-8 items-center justify-center rounded-md transition-colors disabled:opacity-35 disabled:pointer-events-none';
  const activeStyle = active
    ? 'bg-[color-mix(in_srgb,var(--chat-accent)_18%,transparent)] text-[var(--chat-accent)]'
    : 'text-[var(--modal-muted-fg)] hover:bg-[var(--sidebar-row-hover)] hover:text-[var(--modal-fg)]';
  const saveStyle =
    accent === 'save' && !disabled
      ? 'bg-green-600 text-white hover:bg-green-500'
      : activeStyle;

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className={`${base} ${saveStyle}`}
    >
      {children}
    </button>
  );
}

export function FilePreviewHeader({
  showSidebar,
  onToggleSidebar,
  fileName,
  filePath,
  isDirty,
  isMarkdown,
  isCode,
  showMarkdownPreview,
  onToggleMarkdownPreview,
  onSave,
  isSaving,
  canSave,
  onOpenInOS,
  onClose,
}: {
  showSidebar: boolean;
  onToggleSidebar: () => void;
  fileName: string;
  filePath?: string;
  isDirty: boolean;
  isMarkdown: boolean;
  isCode: boolean;
  showMarkdownPreview: boolean;
  onToggleMarkdownPreview: () => void;
  onSave: () => void;
  isSaving: boolean;
  canSave: boolean;
  onOpenInOS: () => void;
  onClose: () => void;
}) {
  return (
    <header
      className="flex h-11 shrink-0 items-center gap-2 border-b px-2 sm:px-3"
      style={{ borderColor: 'var(--modal-border)', background: 'var(--modal-bg-muted)' }}
    >
      <ToolbarButton
        onClick={onToggleSidebar}
        title={showSidebar ? 'Hide explorer' : 'Show explorer'}
        active={showSidebar}
      >
        <PanelLeft size={16} />
      </ToolbarButton>

      <div className="min-w-0 flex-1 flex items-baseline gap-2 overflow-hidden">
        <h2
          className="truncate text-sm font-semibold leading-none shrink-0 max-w-[45%] sm:max-w-none"
          style={{ color: 'var(--modal-fg)' }}
        >
          {fileName}
          {isDirty && (
            <span className="ml-1.5 inline-block h-2 w-2 rounded-full bg-amber-400 align-middle" title="Unsaved changes" />
          )}
        </h2>
        {filePath && (
          <p
            className="hidden sm:block truncate text-[11px] font-mono leading-none opacity-60"
            style={{ color: 'var(--modal-muted-fg)' }}
            title={filePath}
          >
            {filePath}
          </p>
        )}
      </div>

      <div
        className="flex items-center gap-0.5 rounded-lg border p-0.5"
        style={{ borderColor: 'var(--modal-border)', background: 'var(--modal-bg)' }}
      >
        <ToolbarButton onClick={onOpenInOS} title="Open in default app">
          <ExternalLink size={15} />
        </ToolbarButton>

        {isMarkdown && isCode && (
          <ToolbarButton
            onClick={onToggleMarkdownPreview}
            title={showMarkdownPreview ? 'Show source' : 'Preview markdown'}
            active={showMarkdownPreview}
          >
            {showMarkdownPreview ? <Code2 size={15} /> : <Eye size={15} />}
          </ToolbarButton>
        )}

        {isCode && (
          <ToolbarButton
            onClick={onSave}
            title={isSaving ? 'Saving…' : 'Save (Ctrl+S)'}
            disabled={!canSave || isSaving}
            accent={canSave ? 'save' : 'default'}
          >
            {isSaving ? (
              <span className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent" />
            ) : (
              <Save size={15} />
            )}
          </ToolbarButton>
        )}

        <div className="mx-0.5 h-5 w-px" style={{ background: 'var(--modal-border)' }} />

        <ToolbarButton onClick={onClose} title="Close">
          <X size={16} />
        </ToolbarButton>
      </div>
    </header>
  );
}
