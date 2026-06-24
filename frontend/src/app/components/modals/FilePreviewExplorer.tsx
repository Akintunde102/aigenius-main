'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsRight,
  Copy,
  File,
  Folder,
  FolderPlus,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
} from 'lucide-react';
import copy from 'copy-to-clipboard';
import {
  createFile,
  createFolder,
  deleteFile,
  deleteFolder,
  joinPath,
  parentDir,
  renamePath,
} from './file-preview-fs';

export interface ExplorerItem {
  path: string;
  name: string;
  isDir: boolean;
  size?: number;
  mtime?: number;
}

type InlineEdit =
  | { mode: 'create'; kind: 'file' | 'folder'; name: string }
  | { mode: 'rename'; item: ExplorerItem; name: string };

function ExplorerIconButton({
  onClick,
  title,
  disabled,
  children,
}: {
  onClick: () => void;
  title: string;
  disabled?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      aria-label={title}
      className="inline-flex h-6 w-6 items-center justify-center rounded transition-colors disabled:opacity-25 hover:bg-[var(--sidebar-row-hover)]"
      style={{ color: 'var(--modal-muted-fg)' }}
    >
      {children}
    </button>
  );
}

function InlineNameInput({
  value,
  onChange,
  onCommit,
  onCancel,
  placeholder,
}: {
  value: string;
  onChange: (v: string) => void;
  onCommit: () => void;
  onCancel: () => void;
  placeholder: string;
}) {
  const ref = useRef<HTMLInputElement>(null);

  useEffect(() => {
    ref.current?.focus();
    ref.current?.select();
  }, []);

  return (
    <input
      ref={ref}
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full min-w-0 rounded border px-1.5 py-0.5 text-[11px] outline-none"
      style={{
        background: 'var(--modal-bg)',
        borderColor: 'var(--chat-accent)',
        color: 'var(--modal-fg)',
        boxShadow: '0 0 0 1px color-mix(in srgb, var(--chat-accent) 35%, transparent)',
      }}
      onKeyDown={(e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          onCommit();
        } else if (e.key === 'Escape') {
          e.preventDefault();
          onCancel();
        }
      }}
      onBlur={() => {
        window.setTimeout(onCommit, 80);
      }}
    />
  );
}

export function FilePreviewExplorer({
  explorerPath,
  explorerItems,
  explorerLoading,
  activePath,
  resolvedTheme,
  pathHistory,
  forwardHistory,
  onNavigate,
  onGoBack,
  onGoForward,
  onGoUp,
  onGoToOriginal,
  onRefresh,
  onOpenItem,
  onItemDeleted,
  onItemRenamed,
  onItemCreated,
  onError,
}: {
  explorerPath: string;
  explorerItems: ExplorerItem[];
  explorerLoading: boolean;
  activePath?: string;
  resolvedTheme: 'light' | 'dark';
  pathHistory: string[];
  forwardHistory: string[];
  onNavigate: (path: string) => void;
  onGoBack: () => void;
  onGoForward: () => void;
  onGoUp: () => void;
  onGoToOriginal: () => void;
  onRefresh: () => void;
  onOpenItem: (item: ExplorerItem) => void;
  onItemDeleted: (path: string) => void;
  onItemRenamed: (oldPath: string, newPath: string, newName: string, isDir: boolean) => void;
  onItemCreated: (path: string, name: string, isDir: boolean) => void;
  onError: (message: string) => void;
}) {
  const [copiedPath, setCopiedPath] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [inlineEdit, setInlineEdit] = useState<InlineEdit | null>(null);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const newMenuRef = useRef<HTMLDivElement>(null);

  const scrollClass = resolvedTheme === 'dark' ? 'workflow-scroll' : 'workflow-scroll-light';
  const folderLabel = explorerPath.split(/[\\/]/).filter(Boolean).pop() || explorerPath;

  const handleCopyPath = useCallback(() => {
    if (!explorerPath) return;
    copy(explorerPath);
    setCopiedPath(true);
    window.setTimeout(() => setCopiedPath(false), 1500);
  }, [explorerPath]);

  useEffect(() => {
    if (!showNewMenu) return;
    const onDocClick = (e: MouseEvent) => {
      if (newMenuRef.current && !newMenuRef.current.contains(e.target as Node)) {
        setShowNewMenu(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [showNewMenu]);

  const startCreate = (kind: 'file' | 'folder') => {
    setShowNewMenu(false);
    setInlineEdit({ mode: 'create', kind, name: '' });
  };

  const startRename = (item: ExplorerItem) => {
    setInlineEdit({ mode: 'rename', item, name: item.name });
  };

  const cancelInline = () => setInlineEdit(null);

  const commitInline = async () => {
    if (!inlineEdit) return;
    const name = inlineEdit.name.trim();
    if (!name) {
      cancelInline();
      return;
    }

    if (inlineEdit.mode === 'create') {
      const target = joinPath(explorerPath, name);
      const res =
        inlineEdit.kind === 'folder'
          ? await createFolder(target)
          : await createFile(target, '');
      if (!res.ok) {
        onError(res.error || `Failed to create ${inlineEdit.kind}`);
        return;
      }
      onItemCreated(target, name, inlineEdit.kind === 'folder');
      cancelInline();
      onRefresh();
      if (inlineEdit.kind === 'file') {
        onOpenItem({ path: target, name, isDir: false });
      }
      return;
    }

    const { item } = inlineEdit;
    const res = await renamePath(item.path, name, item.isDir);
    if (!res.ok) {
      onError(res.error || 'Failed to rename');
      return;
    }
    const newPath = joinPath(parentDir(item.path), name);
    onItemRenamed(item.path, newPath, name, item.isDir);
    cancelInline();
    onRefresh();
  };

  const handleDelete = async (item: ExplorerItem) => {
    const label = item.isDir ? 'folder' : 'file';
    if (!window.confirm(`Delete ${label} "${item.name}"?`)) return;

    const res = item.isDir ? await deleteFolder(item.path) : await deleteFile(item.path);
    if (!res.ok) {
      onError(res.error || `Failed to delete ${label}`);
      return;
    }
    if (selectedPath === item.path) setSelectedPath(null);
    onItemDeleted(item.path);
    onRefresh();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedPath || inlineEdit) return;
      const item = explorerItems.find((i) => i.path === selectedPath);
      if (!item) return;

      if (e.key === 'F2') {
        e.preventDefault();
        startRename(item);
      }
      if (e.key === 'Delete') {
        e.preventDefault();
        void handleDelete(item);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const sorted = [...explorerItems].sort((a, b) =>
    a.isDir === b.isDir ? a.name.localeCompare(b.name) : a.isDir ? -1 : 1,
  );

  return (
    <aside
      className="flex w-60 shrink-0 flex-col overflow-hidden border-r sm:w-64"
      style={{ borderColor: 'var(--modal-border)', background: 'var(--surface-muted)' }}
    >
      {/* Explorer title row — VS Code style */}
      <div
        className="flex h-8 shrink-0 items-center justify-between px-2.5 text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--modal-muted-fg)', background: 'var(--modal-bg-muted)' }}
      >
        <span>Explorer</span>
        <div className="flex items-center gap-0.5">
          <ExplorerIconButton onClick={onRefresh} title="Refresh">
            <RefreshCw size={13} className={explorerLoading ? 'animate-spin' : ''} />
          </ExplorerIconButton>
          <div className="relative" ref={newMenuRef}>
            <ExplorerIconButton onClick={() => setShowNewMenu((v) => !v)} title="New file or folder">
              <Plus size={14} />
            </ExplorerIconButton>
            {showNewMenu && (
              <div
                className="absolute right-0 top-full z-20 mt-1 min-w-[9rem] overflow-hidden rounded-md border py-1 shadow-lg"
                style={{
                  background: 'var(--modal-bg)',
                  borderColor: 'var(--modal-border)',
                }}
              >
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] hover:bg-[var(--sidebar-row-hover)]"
                  style={{ color: 'var(--modal-fg)' }}
                  onClick={() => startCreate('file')}
                >
                  <File size={12} />
                  New File
                </button>
                <button
                  type="button"
                  className="flex w-full items-center gap-2 px-2.5 py-1.5 text-left text-[11px] hover:bg-[var(--sidebar-row-hover)]"
                  style={{ color: 'var(--modal-fg)' }}
                  onClick={() => startCreate('folder')}
                >
                  <FolderPlus size={12} />
                  New Folder
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Navigation subheader */}
      <div
        className="flex shrink-0 items-center gap-0.5 border-b px-1.5 py-1"
        style={{ borderColor: 'var(--modal-border)', background: 'var(--modal-bg)' }}
      >
        <ExplorerIconButton onClick={onGoBack} title="Back" disabled={pathHistory.length === 0}>
          <ChevronLeft size={14} />
        </ExplorerIconButton>
        <ExplorerIconButton onClick={onGoUp} title="Parent folder">
          <ArrowUp size={14} />
        </ExplorerIconButton>
        <ExplorerIconButton onClick={onGoForward} title="Forward" disabled={forwardHistory.length === 0}>
          <ChevronRight size={14} />
        </ExplorerIconButton>
        <div className="mx-0.5 h-3.5 w-px shrink-0" style={{ background: 'var(--modal-border)' }} />
        <ExplorerIconButton onClick={handleCopyPath} title={`Copy path: ${explorerPath}`}>
          {copiedPath ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
        </ExplorerIconButton>
        <span
          className="min-w-0 flex-1 truncate px-1 font-mono text-[10px]"
          style={{ color: 'var(--modal-muted-fg)' }}
          title={explorerPath}
        >
          {folderLabel}
        </span>
        <ExplorerIconButton onClick={onGoToOriginal} title="Reveal original file">
          <ChevronsRight size={13} />
        </ExplorerIconButton>
      </div>

      {/* File tree */}
      <div className={`min-h-0 flex-1 overflow-auto p-1 ${scrollClass}`}>
        {inlineEdit?.mode === 'create' && (
          <div className="mb-0.5 flex items-center gap-1.5 px-2 py-1">
            {inlineEdit.kind === 'folder' ? (
              <Folder size={13} className="shrink-0 text-blue-400/70" />
            ) : (
              <File size={13} className="shrink-0 opacity-70" />
            )}
            <InlineNameInput
              value={inlineEdit.name}
              onChange={(name) => setInlineEdit({ ...inlineEdit, name })}
              onCommit={() => void commitInline()}
              onCancel={cancelInline}
              placeholder={inlineEdit.kind === 'folder' ? 'folder-name' : 'file-name'}
            />
          </div>
        )}

        {explorerLoading && sorted.length === 0 ? (
          <div className="flex h-24 items-center justify-center opacity-40">
            <RefreshCw size={14} className="animate-spin" />
          </div>
        ) : (
          <div className="space-y-px">
            {sorted.map((item) => {
              const isActive = item.path === activePath;
              const isSelected = item.path === selectedPath;
              const isRenaming =
                inlineEdit?.mode === 'rename' && inlineEdit.item.path === item.path;

              return (
                <div
                  key={item.path}
                  className={`group flex items-center gap-1 rounded-md px-1 py-0.5 ${
                    isActive
                      ? 'bg-[color-mix(in_srgb,var(--chat-accent)_12%,transparent)]'
                      : isSelected
                        ? 'bg-[var(--sidebar-row-active)]'
                        : 'hover:bg-[var(--sidebar-row-hover)]'
                  }`}
                >
                  <button
                    type="button"
                    className="flex min-w-0 flex-1 items-center gap-1.5 py-1 pl-1 text-left"
                    style={{ color: isActive ? 'var(--chat-accent)' : 'var(--modal-fg)' }}
                    onClick={() => {
                      setSelectedPath(item.path);
                      if (item.isDir) onNavigate(item.path);
                      else onOpenItem(item);
                    }}
                    onDoubleClick={(e) => {
                      e.preventDefault();
                      if (!item.isDir) onOpenItem(item);
                    }}
                  >
                    {item.isDir ? (
                      <Folder size={13} className="shrink-0 text-blue-400/65" />
                    ) : (
                      <File size={13} className="shrink-0 opacity-65" />
                    )}
                    {isRenaming ? (
                      <InlineNameInput
                        value={inlineEdit.name}
                        onChange={(name) =>
                          setInlineEdit(
                            inlineEdit.mode === 'rename' ? { ...inlineEdit, name } : inlineEdit,
                          )
                        }
                        onCommit={() => void commitInline()}
                        onCancel={cancelInline}
                        placeholder="name"
                      />
                    ) : (
                      <span className="truncate text-[11px] font-medium">{item.name}</span>
                    )}
                  </button>

                  {!isRenaming && (
                    <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
                      <ExplorerIconButton onClick={() => startRename(item)} title="Rename (F2)">
                        <Pencil size={11} />
                      </ExplorerIconButton>
                      <ExplorerIconButton onClick={() => void handleDelete(item)} title="Delete">
                        <Trash2 size={11} className="text-red-400/90" />
                      </ExplorerIconButton>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </aside>
  );
}
