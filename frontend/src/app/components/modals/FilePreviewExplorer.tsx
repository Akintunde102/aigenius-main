'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronRight,
  ChevronsRight,
  Copy,
  File,
  Folder,
  FolderOpen,
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
import { pathsEqual } from './file-preview-explorer.utils';

export interface ExplorerItem {
  path: string;
  name: string;
  isDir: boolean;
  size?: number;
  mtime?: number;
}

type InlineEdit =
  | { mode: 'create'; kind: 'file' | 'folder'; name: string; parentDir: string }
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

function ExplorerTreeNode({
  item,
  depth,
  activePath,
  selectedPath,
  inlineEdit,
  expanded,
  loading,
  childItems,
  onSelect,
  onToggleExpand,
  onOpenItem,
  onStartRename,
  onDelete,
  onInlineEditChange,
  onInlineCommit,
  onInlineCancel,
}: {
  item: ExplorerItem;
  depth: number;
  activePath?: string;
  selectedPath: string | null;
  inlineEdit: InlineEdit | null;
  expanded: boolean;
  loading: boolean;
  childItems: ExplorerItem[];
  onSelect: (item: ExplorerItem) => void;
  onToggleExpand: (item: ExplorerItem) => void;
  onOpenItem: (item: ExplorerItem) => void;
  onStartRename: (item: ExplorerItem) => void;
  onDelete: (item: ExplorerItem) => void;
  onInlineEditChange: (edit: InlineEdit) => void;
  onInlineCommit: () => void;
  onInlineCancel: () => void;
}) {
  const isActive = pathsEqual(item.path, activePath ?? '');
  const isSelected = pathsEqual(item.path, selectedPath ?? '');
  const isRenaming = inlineEdit?.mode === 'rename' && pathsEqual(inlineEdit.item.path, item.path);
  const indent = 8 + depth * 14;

  return (
    <>
      <div
        className={`group flex items-center gap-0.5 rounded-sm py-px pr-1 ${
          isActive
            ? 'bg-[color-mix(in_srgb,var(--chat-accent)_14%,transparent)]'
            : isSelected
              ? 'bg-[var(--sidebar-row-active)]'
              : 'hover:bg-[var(--sidebar-row-hover)]'
        }`}
        style={{ paddingLeft: indent }}
      >
        {item.isDir ? (
          <button
            type="button"
            className="inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-sm hover:bg-[var(--sidebar-row-hover)]"
            style={{ color: 'var(--modal-muted-fg)' }}
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand(item);
            }}
            aria-label={expanded ? 'Collapse folder' : 'Expand folder'}
          >
            {loading && childItems.length === 0 ? (
              <RefreshCw size={11} className="animate-spin opacity-60" />
            ) : expanded ? (
              <ChevronDown size={13} />
            ) : (
              <ChevronRight size={13} />
            )}
          </button>
        ) : (
          <span className="inline-block h-5 w-5 shrink-0" aria-hidden />
        )}

        <button
          type="button"
          className="flex min-w-0 flex-1 items-center gap-1.5 py-0.5 text-left"
          style={{ color: isActive ? 'var(--chat-accent)' : 'var(--modal-fg)' }}
          onClick={() => {
            onSelect(item);
            if (item.isDir) {
              if (!expanded) onToggleExpand(item);
            } else {
              onOpenItem(item);
            }
          }}
          onDoubleClick={(e) => {
            e.preventDefault();
            if (!item.isDir) onOpenItem(item);
          }}
        >
          {item.isDir ? (
            expanded ? (
              <FolderOpen size={14} className="shrink-0 text-amber-400/80" />
            ) : (
              <Folder size={14} className="shrink-0 text-amber-400/70" />
            )
          ) : (
            <File size={14} className="shrink-0 opacity-65" />
          )}
          {isRenaming ? (
            <InlineNameInput
              value={inlineEdit.name}
              onChange={(name) =>
                onInlineEditChange(
                  inlineEdit.mode === 'rename' ? { ...inlineEdit, name } : inlineEdit,
                )
              }
              onCommit={onInlineCommit}
              onCancel={onInlineCancel}
              placeholder="name"
            />
          ) : (
            <span className="truncate text-[12px] leading-5">{item.name}</span>
          )}
        </button>

        {!isRenaming && (
          <div className="flex shrink-0 items-center opacity-0 transition-opacity group-hover:opacity-100">
            <ExplorerIconButton onClick={() => onStartRename(item)} title="Rename (F2)">
              <Pencil size={11} />
            </ExplorerIconButton>
            <ExplorerIconButton onClick={() => onDelete(item)} title="Delete">
              <Trash2 size={11} className="text-red-400/90" />
            </ExplorerIconButton>
          </div>
        )}
      </div>

      {item.isDir && expanded && childItems.map((child) => (
        <ExplorerTreeBranch
          key={child.path}
          item={child}
          depth={depth + 1}
          activePath={activePath}
          selectedPath={selectedPath}
          inlineEdit={inlineEdit}
          onSelect={onSelect}
          onOpenItem={onOpenItem}
          onStartRename={onStartRename}
          onDelete={onDelete}
          onInlineEditChange={onInlineEditChange}
          onInlineCommit={onInlineCommit}
          onInlineCancel={onInlineCancel}
        />
      ))}
    </>
  );
}

function ExplorerTreeBranch({
  item,
  depth,
  activePath,
  selectedPath,
  inlineEdit,
  onSelect,
  onOpenItem,
  onStartRename,
  onDelete,
  onInlineEditChange,
  onInlineCommit,
  onInlineCancel,
}: {
  item: ExplorerItem;
  depth: number;
  activePath?: string;
  selectedPath: string | null;
  inlineEdit: InlineEdit | null;
  onSelect: (item: ExplorerItem) => void;
  onOpenItem: (item: ExplorerItem) => void;
  onStartRename: (item: ExplorerItem) => void;
  onDelete: (item: ExplorerItem) => void;
  onInlineEditChange: (edit: InlineEdit) => void;
  onInlineCommit: () => void;
  onInlineCancel: () => void;
}) {
  const {
    isExpanded,
    isLoading,
    getChildren,
    toggleExpanded,
  } = useExplorerTreeBranchContext();

  const expanded = isExpanded(item.path);
  const loading = isLoading(item.path);
  const childItems = getChildren(item.path);

  return (
    <ExplorerTreeNode
      item={item}
      depth={depth}
      activePath={activePath}
      selectedPath={selectedPath}
      inlineEdit={inlineEdit}
      expanded={expanded}
      loading={loading}
      childItems={childItems}
      onSelect={onSelect}
      onToggleExpand={() => void toggleExpanded(item.path)}
      onOpenItem={onOpenItem}
      onStartRename={onStartRename}
      onDelete={onDelete}
      onInlineEditChange={onInlineEditChange}
      onInlineCommit={onInlineCommit}
      onInlineCancel={onInlineCancel}
    />
  );
}

type ExplorerTreeBranchContextValue = {
  isExpanded: (dirPath: string) => boolean;
  isLoading: (dirPath: string) => boolean;
  getChildren: (dirPath: string) => ExplorerItem[];
  toggleExpanded: (dirPath: string) => Promise<void>;
};

const ExplorerTreeBranchContext = React.createContext<ExplorerTreeBranchContextValue | null>(null);

function useExplorerTreeBranchContext() {
  const ctx = React.useContext(ExplorerTreeBranchContext);
  if (!ctx) throw new Error('ExplorerTreeBranchContext missing');
  return ctx;
}

export function FilePreviewExplorer({
  treeRoot,
  activePath,
  resolvedTheme,
  originalPath,
  isExpanded,
  isLoading,
  getChildren,
  toggleExpanded,
  onRefresh,
  onRevealOriginal,
  onOpenItem,
  onItemDeleted,
  onItemRenamed,
  onItemCreated,
  onError,
  getCreateTargetDir,
  onInvalidateDirectory,
}: {
  treeRoot: string;
  activePath?: string;
  resolvedTheme: 'light' | 'dark';
  originalPath?: string;
  isExpanded: (dirPath: string) => boolean;
  isLoading: (dirPath: string) => boolean;
  getChildren: (dirPath: string) => ExplorerItem[];
  toggleExpanded: (dirPath: string) => Promise<void>;
  onRefresh: () => void;
  onRevealOriginal: () => void;
  onOpenItem: (item: ExplorerItem) => void;
  onItemDeleted: (path: string) => void;
  onItemRenamed: (oldPath: string, newPath: string, newName: string, isDir: boolean) => void;
  onItemCreated: (path: string, name: string, isDir: boolean) => void;
  onError: (message: string) => void;
  getCreateTargetDir: (selectedPath: string | null, selectedIsDir: boolean) => string;
  onInvalidateDirectory: (dirPath: string) => void;
}) {
  const [copiedPath, setCopiedPath] = useState(false);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [selectedIsDir, setSelectedIsDir] = useState(false);
  const [inlineEdit, setInlineEdit] = useState<InlineEdit | null>(null);
  const [showNewMenu, setShowNewMenu] = useState(false);
  const [rootExpanded, setRootExpanded] = useState(true);
  const newMenuRef = useRef<HTMLDivElement>(null);
  const activeRowRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!activePath) return;
    setSelectedPath(activePath);
  }, [activePath]);

  const scrollClass = resolvedTheme === 'dark' ? 'workflow-scroll' : 'workflow-scroll-light';
  const rootLabel = treeRoot.split(/[\\/]/).filter(Boolean).pop() || treeRoot;
  const rootChildren = getChildren(treeRoot);
  const rootLoading = isLoading(treeRoot);

  const handleCopyPath = useCallback(() => {
    if (!treeRoot) return;
    copy(treeRoot);
    setCopiedPath(true);
    window.setTimeout(() => setCopiedPath(false), 1500);
  }, [treeRoot]);

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

  useEffect(() => {
    activeRowRef.current?.scrollIntoView({ block: 'nearest' });
  }, [activePath, treeRoot]);

  const startCreate = (kind: 'file' | 'folder') => {
    setShowNewMenu(false);
    const parent = getCreateTargetDir(selectedPath, selectedIsDir);
    setInlineEdit({ mode: 'create', kind, name: '', parentDir: parent });
    void toggleExpanded(parent);
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
      const target = joinPath(inlineEdit.parentDir, name);
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
      onInvalidateDirectory(inlineEdit.parentDir);
      await toggleExpanded(inlineEdit.parentDir);
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
    onInvalidateDirectory(parentDir(item.path));
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
    if (selectedPath && pathsEqual(selectedPath, item.path)) setSelectedPath(null);
    onItemDeleted(item.path);
    onInvalidateDirectory(parentDir(item.path));
    onRefresh();
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!selectedPath || inlineEdit) return;

      if (e.key === 'F2') {
        const item =
          rootChildren.find((entry) => pathsEqual(entry.path, selectedPath)) ??
          ({ path: selectedPath, name: selectedPath.split(/[\\/]/).pop() || selectedPath, isDir: selectedIsDir } as ExplorerItem);
        e.preventDefault();
        startRename(item);
      }
      if (e.key === 'Delete') {
        e.preventDefault();
        const item =
          rootChildren.find((entry) => pathsEqual(entry.path, selectedPath)) ??
          ({ path: selectedPath, name: selectedPath.split(/[\\/]/).pop() || selectedPath, isDir: selectedIsDir } as ExplorerItem);
        void handleDelete(item);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  });

  const branchContext: ExplorerTreeBranchContextValue = {
    isExpanded,
    isLoading,
    getChildren,
    toggleExpanded,
  };

  return (
    <aside
      className="flex w-60 shrink-0 flex-col overflow-hidden border-r sm:w-64"
      style={{ borderColor: 'var(--modal-border)', background: 'var(--surface-muted)' }}
    >
      <div
        className="flex h-8 shrink-0 items-center justify-between px-2.5 text-[10px] font-semibold uppercase tracking-wider"
        style={{ color: 'var(--modal-muted-fg)', background: 'var(--modal-bg-muted)' }}
      >
        <span>Explorer</span>
        <div className="flex items-center gap-0.5">
          <ExplorerIconButton onClick={onRefresh} title="Refresh">
            <RefreshCw size={13} className={rootLoading ? 'animate-spin' : ''} />
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

      <div
        className="flex shrink-0 items-center gap-0.5 border-b px-1.5 py-1"
        style={{ borderColor: 'var(--modal-border)', background: 'var(--modal-bg)' }}
      >
        <ExplorerIconButton onClick={handleCopyPath} title={`Copy root path: ${treeRoot}`}>
          {copiedPath ? <Check size={13} className="text-green-500" /> : <Copy size={13} />}
        </ExplorerIconButton>
        <span
          className="min-w-0 flex-1 truncate px-1 font-mono text-[10px] uppercase"
          style={{ color: 'var(--modal-muted-fg)' }}
          title={treeRoot}
        >
          {rootLabel}
        </span>
        {originalPath && (
          <ExplorerIconButton onClick={onRevealOriginal} title="Reveal original file">
            <ChevronsRight size={13} />
          </ExplorerIconButton>
        )}
      </div>

      <div className={`min-h-0 flex-1 overflow-auto py-1 ${scrollClass}`}>
        {inlineEdit?.mode === 'create' && (
          <div
            className="mb-0.5 flex items-center gap-1.5 py-1 pr-1"
            style={{ paddingLeft: 22 }}
          >
            {inlineEdit.kind === 'folder' ? (
              <Folder size={13} className="shrink-0 text-amber-400/70" />
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

        {!treeRoot ? (
          <div className="flex h-24 items-center justify-center opacity-40">
            <RefreshCw size={14} className="animate-spin" />
          </div>
        ) : (
          <ExplorerTreeBranchContext.Provider value={branchContext}>
            <div ref={activeRowRef}>
              <div
                className={`flex items-center gap-0.5 rounded-sm py-0.5 pr-1 hover:bg-[var(--sidebar-row-hover)] ${
                  pathsEqual(treeRoot, activePath ?? '') ? 'bg-[color-mix(in_srgb,var(--chat-accent)_14%,transparent)]' : ''
                }`}
                style={{ paddingLeft: 8 }}
              >
                <button
                  type="button"
                  className="inline-flex h-5 w-5 shrink-0 items-center justify-center"
                  style={{ color: 'var(--modal-muted-fg)' }}
                  onClick={() => setRootExpanded((v) => !v)}
                  aria-label={rootExpanded ? 'Collapse project root' : 'Expand project root'}
                >
                  {rootLoading && rootChildren.length === 0 ? (
                    <RefreshCw size={11} className="animate-spin opacity-60" />
                  ) : rootExpanded ? (
                    <ChevronDown size={13} />
                  ) : (
                    <ChevronRight size={13} />
                  )}
                </button>
                <span
                  className="truncate text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--modal-fg)' }}
                  title={treeRoot}
                >
                  {rootLabel}
                </span>
              </div>

              {rootExpanded && rootChildren.map((item) => (
                <ExplorerTreeBranch
                  key={item.path}
                  item={item}
                  depth={0}
                  activePath={activePath}
                  selectedPath={selectedPath}
                  inlineEdit={inlineEdit}
                  onSelect={(entry) => {
                    setSelectedPath(entry.path);
                    setSelectedIsDir(entry.isDir);
                  }}
                  onOpenItem={onOpenItem}
                  onStartRename={startRename}
                  onDelete={(entry) => void handleDelete(entry)}
                  onInlineEditChange={setInlineEdit}
                  onInlineCommit={() => void commitInline()}
                  onInlineCancel={cancelInline}
                />
              ))}
            </div>
          </ExplorerTreeBranchContext.Provider>
        )}
      </div>
    </aside>
  );
}
