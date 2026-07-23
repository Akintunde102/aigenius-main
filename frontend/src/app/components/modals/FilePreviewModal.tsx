'use client';
import React, { useEffect, useState, useCallback, useRef } from 'react';
import { filePreviewEmitter, FilePreviewPayload, closeFilePreview } from './FilePreviewManager';
import { setActiveEditorContext, clearActiveEditorContext } from '@/lib/code-projects/active-editor-context';
import { X, PanelLeft, Folder } from 'lucide-react';
import Editor, { loader } from '@monaco-editor/react';
import { MarkdownRenderer } from '../model-interface/shared/components/MarkdownRenderer';
import { useTheme } from '@/lib/providers/ThemeProvider';
import { defineMonacoAppThemes, getMonacoThemeId } from './monaco-app-theme';
import { FilePreviewHeader } from './FilePreviewHeader';
import { FilePreviewExplorer } from './FilePreviewExplorer';
import { useDraggablePanel } from './useDraggablePanel';
import { useResizablePanel } from './useResizablePanel';
import { useExplorerTree } from './useExplorerTree';
import { PanelResizeHandles } from './PanelResizeHandles';

// Configure Monaco loader to use local files from public directory
loader.config({
    paths: {
        vs: '/monaco-editor/min/vs'
    }
});

interface FolderItem {
    path: string;
    name: string;
    isDir: boolean;
    size?: number;
    mtime?: number;
}

export const FilePreviewModal: React.FC = () => {
    const { resolvedTheme } = useTheme();
    const monacoThemeId = getMonacoThemeId(resolvedTheme);
    const [payload, setPayload] = useState<FilePreviewPayload | null>(null);
    const [originalPayload, setOriginalPayload] = useState<FilePreviewPayload | null>(null);
    const [folderItems, setFolderItems] = useState<FolderItem[]>([]);
    const [loadingFolder, setLoadingFolder] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Editing & Preview State
    const [editedContent, setEditedContent] = useState<string>('');
    const [isSaving, setIsSaving] = useState(false);
    const [showMarkdownPreview, setShowMarkdownPreview] = useState(false);
    const [showSidebar, setShowSidebar] = useState(false);
    const blobUrlRef = useRef<string | null>(null);
    const editorRef = useRef<any>(null);
    const panelRef = useRef<HTMLDivElement | null>(null);
    const syncEditorContext = useCallback((p: FilePreviewPayload, line = 1, character = 1, selection?: string) => {
        if (p.type === 'code' && p.localPath) {
            setActiveEditorContext({
                path: p.localPath,
                name: p.name,
                line,
                character,
                ...(selection ? { selection } : {}),
            });
            const bridge = (window as { aigeniusDesktop?: { syncActiveEditor?: (x: unknown) => Promise<unknown> } }).aigeniusDesktop;
            void bridge?.syncActiveEditor?.({
                path: p.localPath,
                name: p.name,
                line,
                character,
                ...(selection ? { selection } : {}),
            });
        }
    }, []);

    const handleEditorMount = useCallback((editor: any) => {
        editorRef.current = editor;
        const updateCursor = () => {
            if (!payload?.localPath || payload.type !== 'code') return;
            const pos = editor.getPosition();
            const sel = editor.getModel()?.getValueInRange(editor.getSelection());
            syncEditorContext(
                payload,
                pos?.lineNumber ?? 1,
                pos?.column ?? 1,
                sel && sel !== editor.getModel()?.getLineContent(pos?.lineNumber ?? 1) ? sel : undefined,
            );
        };
        editor.onDidChangeCursorPosition(updateCursor);
        editor.onDidChangeCursorSelection(updateCursor);
        updateCursor();
    }, [payload, syncEditorContext]);

    // Explorer tree state is managed by useExplorerTree below.

    const isOpen = !!payload;
    const isSidePanel = payload?.placement === 'side';
    const {
        treeRoot,
        revealPath,
        toggleExpanded,
        refreshTree,
        invalidateDirectory,
        resetTree,
        isExpanded,
        isLoading: isExplorerLoading,
        getChildren,
        getCreateTargetDir,
    } = useExplorerTree(payload?.localPath, isOpen && showSidebar, payload?.type === 'folder');
    const {
        panelStyle: draggablePanelStyle,
        position: panelPosition,
        setPosition: setPanelPosition,
        isDragging,
        onDragHandlePointerDown,
    } = useDraggablePanel(
        isOpen,
        panelRef,
        payload?.localPath ?? payload?.name ?? null,
        isSidePanel ? 'side' : 'modal',
    );
    const {
        panelSizeStyle,
        isResizing,
        resizeEdges,
        onResizeHandlePointerDown,
        syncSizeFromElement,
    } = useResizablePanel(
        isOpen,
        panelRef,
        isSidePanel ? 'side' : 'modal',
        panelPosition,
        setPanelPosition,
    );

    const handleDragHandlePointerDown = useCallback(
        (event: React.PointerEvent<HTMLElement>) => {
            if (isSidePanel && !panelPosition) {
                syncSizeFromElement();
            }
            onDragHandlePointerDown(event);
        },
        [isSidePanel, onDragHandlePointerDown, panelPosition, syncSizeFromElement],
    );
    const isDirty = payload?.type === 'code' && editedContent !== (payload.textContent || '');
    const isMarkdown = Boolean(
        payload?.name.toLowerCase().endsWith('.md') || payload?.name.toLowerCase().endsWith('.markdown'),
    );

    const handleEditorWillMount = useCallback((monaco: Parameters<NonNullable<React.ComponentProps<typeof Editor>['beforeMount']>>[0]) => {
        defineMonacoAppThemes(monaco);
    }, []);

    useEffect(() => {
        loader.init().then((monaco) => {
            defineMonacoAppThemes(monaco);
        });
    }, [resolvedTheme]);

    // Helper to cleanup blob URLs
    const cleanupBlob = useCallback(() => {
        if (blobUrlRef.current) {
            URL.revokeObjectURL(blobUrlRef.current);
            blobUrlRef.current = null;
        }
    }, []);

    // Helper to save file
    const handleSave = useCallback(async () => {
        if (!payload?.localPath || !isDirty) return;
        setIsSaving(true);
        try {
            const bridge = (window as any).aigeniusDesktop;
            if (bridge?.runLocalDesktopTool) {
                const res = await bridge.runLocalDesktopTool({
                    tool: 'local_apply_patch',
                    arguments: {
                        operations: [
                            {
                                op: 'update_file',
                                path: payload.localPath,
                                content: editedContent
                            }
                        ]
                    }
                });
                if (res.ok) {
                    setPayload(p => p ? { ...p, textContent: editedContent } : p);
                    if (originalPayload?.localPath === payload.localPath) {
                        setOriginalPayload(p => p ? { ...p, textContent: editedContent } : p);
                    }
                } else {
                    setError(res.error || 'Failed to save file');
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to save changes');
        } finally {
            setIsSaving(false);
        }
    }, [payload, isDirty, editedContent, originalPayload?.localPath]);

    // Open in OS
    const handleOpenInOS = useCallback(async () => {
        if (!payload?.localPath) return;
        try {
            const bridge = (window as any).aigeniusDesktop;
            if (bridge?.runLocalDesktopTool) {
                await bridge.runLocalDesktopTool({
                    tool: 'local_open_in_os',
                    arguments: { path: payload.localPath }
                });
            }
        } catch (err) {
            console.error('[FilePreviewModal] Open in OS error:', err);
        }
    }, [payload]);

    // Keyboard Shortcuts
    useEffect(() => {
        if (!isOpen) return;
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                closeFilePreview();
            }
            if ((e.ctrlKey || e.metaKey) && e.key === 's') {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [isOpen, handleSave]);

    const handleItemClick = useCallback(async (item: FolderItem) => {
        if (item.isDir) return;
        const ext = item.name.split('.').pop()?.toLowerCase() || '';
        const imageExts = ['png', 'jpg', 'jpeg', 'gif', 'webp', 'svg'];
        const pdfExts = ['pdf'];

        let type = 'code';
        if (imageExts.includes(ext)) type = 'image';
        else if (pdfExts.includes(ext)) type = 'pdf';

        const newPayload: FilePreviewPayload = {
            url: `local-file://${encodeURIComponent(item.path)}`,
            name: item.name,
            type: type as any,
            localPath: item.path,
            textContent: type === 'code' ? '// Loading code...' : undefined
        };

        setPayload(newPayload);
        setError(null);
        setShowMarkdownPreview(false);
        cleanupBlob();
    }, [cleanupBlob]);

    const goToOriginal = useCallback(() => {
        if (originalPayload?.localPath) {
            void revealPath(originalPayload.localPath);
        }
    }, [originalPayload?.localPath, revealPath]);

    const handleItemDeleted = useCallback((deletedPath: string) => {
        if (payload?.localPath === deletedPath) {
            closeFilePreview();
        }
        if (originalPayload?.localPath === deletedPath) {
            setOriginalPayload(null);
        }
    }, [payload?.localPath, originalPayload?.localPath]);

    const handleItemRenamed = useCallback((oldPath: string, newPath: string, newName: string, isDir: boolean) => {
        if (payload?.localPath === oldPath) {
            setPayload((p) => p ? { ...p, localPath: newPath, name: newName, type: isDir ? 'folder' : p.type } : p);
        }
        if (originalPayload?.localPath === oldPath) {
            setOriginalPayload((p) => p ? { ...p, localPath: newPath, name: newName } : p);
        }
    }, [payload?.localPath, originalPayload?.localPath]);

    const handleItemCreated = useCallback((_path: string, _name: string, _isDir: boolean) => {
        /* explorer refresh handles listing */
    }, []);

    const fetchFolderContents = useCallback(async (path: string) => {
        setLoadingFolder(true);
        setError(null);
        try {
            const bridge = (window as any).aigeniusDesktop;
            if (bridge?.runLocalDesktopTool) {
                const res = await bridge.runLocalDesktopTool({
                    tool: 'local_list_directory',
                    arguments: { path, limit: 100 }
                });
                if (res.ok) {
                    const data = res.rawData || JSON.parse(res.result);
                    setFolderItems(data.items || []);
                } else {
                    setError(res.error || 'Failed to list directory');
                }
            }
        } catch (err: any) {
            setError(err.message || 'Failed to list directory');
        } finally {
            setLoadingFolder(false);
        }
    }, []);

    useEffect(() => {
        const handleOpen = (p: FilePreviewPayload) => {
            resetTree();
            setPayload(p);
            setOriginalPayload(p);
            setFolderItems([]);
            setLoadingFolder(false);
            setError(null);
            setEditedContent(p.textContent || '');
            setShowMarkdownPreview(false);
            setShowSidebar(!!p.localPath);
            cleanupBlob();
            if (p.type === 'code' && p.localPath) {
                syncEditorContext(p);
            }
        };
        const handleClose = () => {
            setPayload(null);
            setOriginalPayload(null);
            setError(null);
            cleanupBlob();
            resetTree();
            clearActiveEditorContext();
            const bridge = (window as { aigeniusDesktop?: { syncActiveEditor?: (x: null) => Promise<unknown> } }).aigeniusDesktop;
            void bridge?.syncActiveEditor?.(null);
        };

        filePreviewEmitter.on('open', handleOpen);
        filePreviewEmitter.on('close', handleClose);

        return () => {
            filePreviewEmitter.off('open', handleOpen);
            filePreviewEmitter.off('close', handleClose);
        };
    }, [cleanupBlob, resetTree, syncEditorContext]);

    useEffect(() => {
        if (!isOpen || !payload) return;
        const bridge = (window as any).aigeniusDesktop;
        if (!bridge) return;

        if (payload.type === 'folder' && payload.localPath) {
            fetchFolderContents(payload.localPath);
        } else if (payload.type === 'code' && payload.localPath && (!payload.textContent || payload.textContent === '// Loading code...')) {
            const fetchCode = async () => {
                try {
                    const res = await bridge.runLocalDesktopTool({
                        tool: 'local_read_file',
                        arguments: { path: payload.localPath }
                    });
                    if (res.ok) {
                        const data = res.rawData || JSON.parse(res.result);
                        setPayload(p => p ? { ...p, textContent: data.content } : p);
                        setEditedContent(data.content);
                        if (originalPayload?.localPath === payload.localPath) {
                            setOriginalPayload(p => p ? { ...p, textContent: data.content } : p);
                        }
                    } else {
                        setError(`Failed to read file: ${res.error}`);
                    }
                } catch (err: any) {
                    setError(`Exception reading file: ${err.message}`);
                }
            };
            fetchCode();
        } else if ((payload.type === 'image' || payload.type === 'pdf') && payload.localPath && (payload.url === '' || payload.url.startsWith('local-file://'))) {
            const fetchMedia = async () => {
                try {
                    if (!payload.localPath) return;
                    const res = await bridge.readLocalFilePreview(payload.localPath);
                    if (res.ok) {
                        const b64toBlob = (b64Data: string, contentType: string) => {
                            const byteCharacters = atob(b64Data);
                            const byteArrays = [];
                            for (let offset = 0; offset < byteCharacters.length; offset += 512) {
                                const slice = byteCharacters.slice(offset, offset + 512);
                                const byteNumbers = new Array(slice.length);
                                for (let i = 0; i < slice.length; i++) {
                                    byteNumbers[i] = slice.charCodeAt(i);
                                }
                                const byteArray = new Uint8Array(byteNumbers);
                                byteArrays.push(byteArray);
                            }
                            return new Blob(byteArrays, { type: contentType });
                        };

                        const blob = b64toBlob(res.base64, res.mimeType);
                        const blobUrl = URL.createObjectURL(blob);
                        blobUrlRef.current = blobUrl;
                        setPayload(p => p ? { ...p, url: blobUrl } : p);
                    } else {
                        setError(`Media loading failed: ${res.error}`);
                    }
                } catch (err: any) {
                    setError(`Media exception: ${err.message}`);
                }
            };
            fetchMedia();
        }
    }, [isOpen, payload?.type, payload?.localPath, payload?.textContent, payload?.url, fetchFolderContents, originalPayload?.localPath]);

    if (!payload) return null;

    const renderMainContent = () => {
        if (error) {
            return (
                <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-6">
                    <div className="w-20 h-20 rounded-full bg-red-500/10 flex items-center justify-center text-red-500 border border-red-500/20 shadow-lg"><X size={40} /></div>
                    <div className="space-y-2 max-w-md"><h3 className="text-xl font-bold tracking-tight" style={{ color: 'var(--modal-fg)' }}>Preview Unavailable</h3><p className="text-sm leading-relaxed" style={{ color: 'var(--modal-muted-fg)' }}>{error}</p></div>
                    <button onClick={() => setError(null)} className="app-modal-btn-primary px-5 py-2.5 active:scale-95">Retry Loading</button>
                </div>
            );
        }

        switch (payload.type) {
            case 'image':
                return (
                    <div className="flex-1 flex items-center justify-center overflow-auto p-4 bg-black/40">
                        {!payload.url ? <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div> : <img src={payload.url} alt={payload.name} className="max-w-full max-h-full object-contain rounded-lg shadow-2xl" />}
                    </div>
                );
            case 'pdf':
                return (
                    <div className="flex-1 w-full flex flex-col overflow-hidden" style={{ background: 'var(--surface-muted)' }}>
                        {!payload.url ? <div className="flex-1 flex items-center justify-center"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div></div> : (
                            <iframe src={payload.url} className="w-full h-full border-none" style={{ background: 'var(--modal-bg)' }} title={payload.name} />
                        )}
                    </div>
                );
            case 'code':
                const isCodeLoading = !payload.textContent || payload.textContent === '// Loading code...';
                if (showMarkdownPreview && isMarkdown) {
                    return (
                        <div
                            className={`flex-1 w-full overflow-auto p-8 ${resolvedTheme === 'dark' ? 'workflow-scroll' : 'workflow-scroll-light'}`}
                            style={{ background: 'var(--modal-bg)', color: 'var(--modal-fg)' }}
                        >
                            <MarkdownRenderer content={editedContent} />
                        </div>
                    );
                }
                return (
                    <div className="flex-1 w-full overflow-hidden relative" style={{ background: 'var(--modal-bg)' }}>
                        {isCodeLoading && <div className="absolute inset-0 flex items-center justify-center z-10" style={{ background: 'color-mix(in srgb, var(--modal-bg) 82%, transparent)' }}><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div></div>}
                        <Editor
                            height="100%"
                            theme={monacoThemeId}
                            path={payload.localPath ?? payload.name}
                            value={payload.textContent}
                            onChange={(value) => setEditedContent(value || '')}
                            onMount={handleEditorMount}
                            beforeMount={handleEditorWillMount}
                            options={{
                                readOnly: false,
                                minimap: { enabled: true },
                                scrollBeyondLastLine: false,
                                fontSize: 13,
                                wordWrap: 'on',
                                padding: { top: 10, bottom: 10 },
                                automaticLayout: true,
                                lineNumbers: 'on',
                                scrollbar: { vertical: 'visible', horizontal: 'visible', verticalScrollbarSize: 10, horizontalScrollbarSize: 10 }
                            }}
                        />
                    </div>
                );
            case 'folder':
                return (
                    <div className="flex-1 flex flex-col items-center justify-center p-12 text-center" style={{ background: 'var(--surface-muted)' }}>
                        <div className="w-24 h-24 rounded-3xl bg-blue-500/10 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-2xl mb-8 group-hover:scale-110 transition-transform duration-500">
                            <Folder size={48} />
                        </div>
                        <div className="space-y-3 max-w-sm mb-10">
                            <h3 className="text-2xl font-bold tracking-tight" style={{ color: 'var(--modal-fg)' }}>Directory View</h3>
                            <p className="text-sm leading-relaxed font-medium" style={{ color: 'var(--modal-muted-fg)' }}>You are viewing the <span className="text-blue-400 font-mono text-[13px]">{payload.name}</span> folder. Use the sidebar to explore its contents.</p>
                        </div>
                        <button onClick={() => setShowSidebar(true)} className="app-modal-btn-primary flex items-center gap-3 px-8 py-4 rounded-2xl font-bold shadow-2xl active:scale-95 group">
                            <PanelLeft size={18} className="group-hover:-translate-x-1 transition-transform" />
                            <span>Open Explorer Sidebar</span>
                        </button>
                    </div>
                );
            default:
                return <div className="flex-1 flex items-center justify-center" style={{ color: 'var(--modal-muted-fg)' }}>Not supported</div>;
        }
    };

    const panelHeader = (
        <FilePreviewHeader
            showSidebar={showSidebar}
            onToggleSidebar={() => setShowSidebar((v) => !v)}
            fileName={payload.name}
            filePath={payload.localPath}
            isDirty={isDirty}
            isMarkdown={isMarkdown}
            isCode={payload.type === 'code'}
            showMarkdownPreview={showMarkdownPreview}
            onToggleMarkdownPreview={() => setShowMarkdownPreview((v) => !v)}
            onSave={handleSave}
            isSaving={isSaving}
            canSave={isDirty}
            onOpenInOS={handleOpenInOS}
            onClose={closeFilePreview}
            draggable
            isDragging={isDragging}
            onDragHandlePointerDown={handleDragHandlePointerDown}
        />
    );

    const panelMain = (
        <div className="flex min-h-0 flex-1 overflow-hidden">
            {showSidebar && payload.localPath && (
                <FilePreviewExplorer
                    treeRoot={treeRoot}
                    activePath={payload.localPath}
                    resolvedTheme={resolvedTheme}
                    originalPath={originalPayload?.localPath}
                    isExpanded={isExpanded}
                    isLoading={isExplorerLoading}
                    getChildren={getChildren}
                    toggleExpanded={toggleExpanded}
                    onRefresh={() => void refreshTree()}
                    onRevealOriginal={goToOriginal}
                    onOpenItem={handleItemClick}
                    onItemDeleted={handleItemDeleted}
                    onItemRenamed={handleItemRenamed}
                    onItemCreated={handleItemCreated}
                    onError={setError}
                    getCreateTargetDir={getCreateTargetDir}
                    onInvalidateDirectory={invalidateDirectory}
                />
            )}
            <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                {renderMainContent()}
            </div>
        </div>
    );

    const hasCustomPosition = draggablePanelStyle?.position === 'fixed';
    const panelChromeClassName = `app-modal-panel relative flex h-full w-full flex-col overflow-hidden shadow-2xl ${
        isSidePanel ? 'border-l' : 'rounded-2xl'
    }`;

    if (isSidePanel) {
        return (
            <div
                ref={panelRef}
                className="file-preview-side-host fixed z-[120] flex animate-in slide-in-from-right duration-300"
                style={{
                    top: hasCustomPosition ? undefined : 'var(--aigenius-desktop-titlebar-top, 0px)',
                    bottom: hasCustomPosition ? undefined : 0,
                    right: hasCustomPosition ? undefined : 0,
                    height: hasCustomPosition
                        ? panelSizeStyle.height
                        : 'calc(100vh - var(--aigenius-desktop-titlebar-top, 0px))',
                    maxHeight: 'calc(100vh - var(--aigenius-desktop-titlebar-top, 0px))',
                    ...panelSizeStyle,
                    ...draggablePanelStyle,
                }}
            >
                <div
                    className={panelChromeClassName}
                    onClick={(e) => e.stopPropagation()}
                    style={{
                        borderColor: 'var(--modal-border, rgba(255,255,255,0.08))',
                        background: 'var(--modal-bg)',
                    }}
                >
                    <PanelResizeHandles
                        edges={resizeEdges}
                        onResizeHandlePointerDown={onResizeHandlePointerDown}
                        isResizing={isResizing}
                    />
                    {panelHeader}
                    {panelMain}
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 z-[9999] backdrop-blur-md animate-in fade-in duration-300"
            style={{ background: 'var(--modal-overlay)' }}
            onClick={closeFilePreview}
        >
            <div
                ref={panelRef}
                className="app-modal-panel relative flex flex-col overflow-hidden rounded-2xl shadow-2xl animate-in zoom-in-95 duration-300"
                onClick={(e) => e.stopPropagation()}
                style={{
                    ...panelSizeStyle,
                    ...draggablePanelStyle,
                }}
            >
                <PanelResizeHandles
                    edges={resizeEdges}
                    onResizeHandlePointerDown={onResizeHandlePointerDown}
                    isResizing={isResizing}
                />
                {panelHeader}
                {panelMain}
            </div>
        </div>
    );
};
