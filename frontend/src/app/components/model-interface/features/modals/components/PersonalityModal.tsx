import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { FiX, FiPlus, FiSearch, FiEdit2, FiTrash2, FiChevronRight } from 'react-icons/fi';
import { upsertPersonality, deletePersonality, Personality } from '@/lib/calls/model-chat-conversation';
import { uploadFile } from '@/lib/calls/upload-file';
import type { CloudFile } from '@/app/components/file/file.interface';
import { useLanguage } from '@/lib/providers/LanguageProvider';

interface PersonalityModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (personality: Personality | null) => void;
    currentModelId?: string;
    currentModelName?: string;
    personalities: Personality[];
    setPersonalities: (personalities: Personality[] | ((prev: Personality[]) => Personality[])) => void;
    currentUser?: any;
}

type ViewTab = 'browse' | 'mine';

// ─── Icon display ────────────────────────────────────────────────────────────
function PersonalityIcon({ icon, size = 36 }: { icon?: string | null; size?: number }) {
    const baseStyle: React.CSSProperties = {
        width: size,
        height: size,
        flexShrink: 0,
        borderRadius: '10px',
        background: 'var(--surface-muted)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.48,
        overflow: 'hidden',
    };

    if (!icon) {
        return <span style={{ ...baseStyle, color: 'var(--modal-muted-fg)' }}>🎭</span>;
    }
    if (icon.startsWith('http') || icon.startsWith('data:')) {
        return (
            <img
                src={icon}
                alt="icon"
                style={{ width: size, height: size, borderRadius: '10px', objectFit: 'cover', flexShrink: 0 }}
                loading="lazy"
                decoding="async"
            />
        );
    }
    return <span style={baseStyle}>{icon}</span>;
}

// ─── Personality Card ────────────────────────────────────────────────────────
function PersonalityCard({
    p,
    isCreator,
    onSelect,
    onEdit,
    onDelete,
}: {
    p: Personality;
    isCreator: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onDelete: () => Promise<void>;
}) {
    const [deleting, setDeleting] = useState(false);

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation();
        setDeleting(true);
        try { await onDelete(); } finally { setDeleting(false); }
    };

    return (
        <div
            role="button"
            tabIndex={0}
            onClick={onSelect}
            onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelect(); } }}
            className="group relative flex flex-col gap-2 rounded-xl border cursor-pointer app-model-card focus-visible:outline-none"
            style={{ padding: '10px 12px' }}
        >
            {/* Header */}
            <div className="flex items-center gap-2.5 min-w-0">
                <PersonalityIcon icon={p.icon} size={32} />
                <div className="flex-1 min-w-0">
                    <div className="app-model-card__title truncate text-[13px] font-medium">{p.name}</div>
                    {p.creator && (
                        <div className="app-model-card__cost truncate text-[11px]">
                            by {p.creator.firstName} {p.creator.lastName || ''}
                        </div>
                    )}
                </div>
                {isCreator && (
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button
                            type="button"
                            title="Edit"
                            className="h-6 w-6 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                            style={{ color: 'var(--modal-muted-fg)' }}
                            onClick={(e) => { e.stopPropagation(); onEdit(); }}
                        >
                            <FiEdit2 size={12} strokeWidth={2} />
                        </button>
                        <button
                            type="button"
                            title="Delete"
                            disabled={deleting}
                            className="h-6 w-6 flex items-center justify-center rounded-lg transition-colors hover:bg-red-500/10 hover:text-red-500"
                            style={{ color: 'var(--modal-muted-fg)' }}
                            onClick={handleDelete}
                        >
                            <FiTrash2 size={12} strokeWidth={2} />
                        </button>
                    </div>
                )}
            </div>

            {/* Description */}
            {p.description && (
                <p className="app-model-card__desc text-xs line-clamp-2 leading-snug">{p.description}</p>
            )}

            {/* Prompt preview */}
            {p.prompt && (
                <p
                    className="text-[10.5px] line-clamp-2 leading-relaxed rounded-md px-2.5 py-1.5"
                    style={{
                        color: 'var(--modal-muted-fg)',
                        background: 'var(--surface-muted)',
                        fontFamily: 'ui-monospace, monospace',
                    }}
                >
                    {p.prompt}
                </p>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between mt-auto pt-0.5">
                {isCreator ? (
                    <span
                        className="text-[10px] font-medium px-1.5 py-0.2 rounded-full"
                        style={{
                            color: 'var(--chat-accent)',
                            background: 'color-mix(in srgb, var(--chat-accent) 10%, transparent)',
                        }}
                    >
                        Your creation
                    </span>
                ) : <span />}
                <span
                    className="inline-flex items-center gap-0.5 text-[11px] font-medium opacity-0 group-hover:opacity-100 transition-opacity"
                    style={{ color: 'var(--modal-muted-fg)' }}
                >
                    Use <FiChevronRight size={11} />
                </span>
            </div>
        </div>
    );
}

// ─── Field label ─────────────────────────────────────────────────────────────
function FieldLabel({ children, required }: { children: React.ReactNode; required?: boolean }) {
    return (
        <label className="block text-xs font-medium mb-1" style={{ color: 'var(--modal-muted-fg)' }}>
            {children}
            {required && <span className="ml-0.5 text-red-500">*</span>}
        </label>
    );
}

// ─── Editor panel ─────────────────────────────────────────────────────────────
function Editor({
    initial,
    onCancel,
    onSave,
    currentModelId,
    currentModelName,
}: {
    initial: Partial<Personality>;
    onCancel: () => void;
    onSave: (p: { id?: string; name: string; description?: string; prompt: string; icon?: string; modelId?: string }) => void;
    currentModelId?: string;
    currentModelName?: string;
}) {
    const { t } = useLanguage();
    const [name, setName] = useState(initial.name || '');
    const [description, setDescription] = useState(initial.description || '');
    const [prompt, setPrompt] = useState(initial.prompt || '');
    const [icon, setIcon] = useState(initial.icon || '');
    const [uploading, setUploading] = useState(false);
    const [uploadPercent, setUploadPercent] = useState(0);
    const [modelId, setModelId] = useState<string>(initial.modelId as string || currentModelId || '');
    const [modelName, setModelName] = useState<string>(
        initial.modelId && initial.modelId !== currentModelId
            ? (initial.modelId as string)
            : (currentModelName || currentModelId || ''),
    );

    const isEditing = Boolean(initial?.id);
    const canSave = name.trim() !== '' && prompt.trim() !== '';

    useEffect(() => {
        const handler = (event: Event) => {
            const detail = (event as CustomEvent<{ modelId?: string; modelName?: string }>).detail || {};
            if (detail.modelId) setModelId(detail.modelId);
            const pickedName = detail.modelName ?? detail.modelId;
            if (pickedName) setModelName(pickedName);
        };
        window.addEventListener('model-picked', handler as EventListener);
        return () => window.removeEventListener('model-picked', handler as EventListener);
    }, []);

    const handleIconFile = async (file: File) => {
        if (!file) return;
        setUploading(true);
        setUploadPercent(0);
        try {
            await uploadFile({
                file,
                onProgress: ({ percent }) => setUploadPercent(percent),
                onSuccess: (data: CloudFile) => { setIcon(data.s3Link); setUploading(false); },
                onError: () => setUploading(false),
            });
        } catch { setUploading(false); }
    };

    const inputClass = 'app-modal-input w-full rounded-lg px-2.5 py-1.5 text-xs focus:outline-none';

    return (
        <div className="flex flex-col overflow-y-auto" style={{ maxHeight: '85vh', padding: '18px 20px', gap: '14px' }}>
            {/* Editor header */}
            <div className="flex items-start justify-between shrink-0">
                <div>
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--modal-fg)' }}>
                        {isEditing ? t('modals.editPersonality', 'Edit Personality') : t('modals.newPersonality', 'New Personality')}
                    </h3>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--modal-muted-fg)' }}>
                        {isEditing ? t('modals.personalityUpdateSubtitle', "Update this personality's details.") : t('modals.personalityNewSubtitle', 'Define a new AI personality for your chats.')}
                    </p>
                </div>
                <button
                    type="button"
                    onClick={onCancel}
                    className="h-7 w-7 flex items-center justify-center rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors shrink-0"
                    style={{ color: 'var(--modal-muted-fg)' }}
                    aria-label={t('common.cancel', 'Cancel')}
                >
                    <FiX size={15} strokeWidth={2} />
                </button>
            </div>

            {/* Icon + Name */}
            <div className="grid gap-3" style={{ gridTemplateColumns: '60px 1fr' }}>
                <div className="flex flex-col items-center gap-1.5">
                    <PersonalityIcon icon={icon || null} size={48} />
                    <label className="text-[10px] font-medium cursor-pointer" style={{ color: 'var(--modal-muted-fg)' }}>
                        Upload
                        <input type="file" accept="image/*" className="hidden"
                            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleIconFile(f); }} />
                    </label>
                    {uploading && <div className="text-[10px]" style={{ color: 'var(--modal-muted-fg)' }}>{uploadPercent}%</div>}
                </div>
                <div className="flex flex-col gap-2">
                    <div>
                        <FieldLabel required>Name</FieldLabel>
                        <input className={inputClass} value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Marketing Expert" />
                    </div>
                    <div>
                        <FieldLabel>Icon (emoji or URL)</FieldLabel>
                        <input className={inputClass} value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🎯 or https://..." />
                    </div>
                </div>
            </div>

            {/* Description */}
            <div>
                <FieldLabel>Description</FieldLabel>
                <input className={inputClass} value={description} onChange={(e) => setDescription(e.target.value)}
                    placeholder="A short summary of what this personality does" />
            </div>

            {/* Default Model picker */}
            <div>
                <FieldLabel>Default Model</FieldLabel>
                <button
                    type="button"
                    className="w-full rounded-lg border text-xs flex items-center justify-between gap-2 px-2.5 py-1.5 transition-colors text-left hover:border-[color-mix(in_srgb,var(--modal-border)_50%,var(--modal-fg))]"
                    style={{ background: 'var(--modal-bg)', borderColor: 'var(--modal-border)', color: 'var(--modal-fg)' }}
                    onClick={() => window.dispatchEvent(new CustomEvent('request-model-pick', { detail: {} }))}
                >
                    <span className="truncate font-medium" style={{ color: modelName ? 'var(--modal-fg)' : 'var(--modal-muted-fg)' }}>
                        {modelName || modelId || 'Select a model…'}
                    </span>
                    <FiChevronRight size={13} className="shrink-0" style={{ color: 'var(--modal-muted-fg)' }} />
                </button>
            </div>

            {/* System prompt */}
            <div>
                <FieldLabel required>System Prompt</FieldLabel>
                <textarea
                    className={`${inputClass} resize-none leading-relaxed`}
                    style={{ minHeight: '90px' }}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    placeholder="Describe how this personality should behave, its tone, expertise, and boundaries…"
                />
            </div>

            {/* Action buttons */}
            <div className="flex items-center justify-between shrink-0 pt-1">
                <button
                    type="button"
                    onClick={onCancel}
                    className="text-xs font-medium px-3.5 py-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
                    style={{ color: 'var(--modal-muted-fg)' }}
                >
                    {t('common.cancel', 'Cancel')}
                </button>
                <button
                    type="button"
                    disabled={!canSave}
                    className="text-xs font-semibold px-4 py-1.5 rounded-lg transition-opacity disabled:opacity-40 disabled:cursor-not-allowed hover:opacity-88"
                    style={{ background: 'var(--chat-accent)', color: 'var(--chat-canvas-bg)' }}
                    onClick={() => onSave({ id: initial.id, name: name.trim(), description: description.trim(), prompt: prompt.trim(), icon: icon.trim(), modelId })}
                >
                    {isEditing ? 'Save changes' : 'Create personality'}
                </button>
            </div>
        </div>
    );
}

// ─── Main modal ──────────────────────────────────────────────────────────────
export function PersonalityModal({
    isOpen,
    onClose,
    onSelect,
    currentModelId,
    currentModelName,
    personalities,
    setPersonalities,
    currentUser,
}: PersonalityModalProps) {
    const { t } = useLanguage();
    const [search, setSearch] = useState('');
    const [activeTab, setActiveTab] = useState<ViewTab>('browse');
    const [showEditor, setShowEditor] = useState(false);
    const [editing, setEditing] = useState<Partial<Personality> | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);

    const isCreator = useCallback(
        (p: Personality) => Boolean(currentUser && p.userId === currentUser.id),
        [currentUser],
    );

    const myPersonalities = useMemo(() => personalities.filter(isCreator), [personalities, isCreator]);

    const filtered = useMemo(() => {
        const t = search.toLowerCase();
        const base = activeTab === 'mine' ? myPersonalities : personalities;
        return base.filter((p) => p.name.toLowerCase().includes(t) || (p.description || '').toLowerCase().includes(t));
    }, [personalities, myPersonalities, search, activeTab]);

    const openEditor = useCallback((p?: Partial<Personality>) => {
        setErrorMessage(null);
        setEditing(p ?? {});
        setShowEditor(true);
    }, []);

    const closeEditor = useCallback(() => {
        setErrorMessage(null);
        setShowEditor(false);
        setEditing(null);
    }, []);

    useEffect(() => {
        if (!isOpen) return;
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') { showEditor ? closeEditor() : onClose(); }
        };
        window.addEventListener('keydown', handler);
        return () => window.removeEventListener('keydown', handler);
    }, [isOpen, showEditor, closeEditor, onClose]);

    if (!isOpen) return null;

    const overlayStyle: React.CSSProperties = { background: 'var(--modal-overlay)' };
    const panelBase: React.CSSProperties = {
        background: 'var(--modal-bg)',
        borderColor: 'var(--modal-border)',
        color: 'var(--modal-fg)',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.4), 0 0 0 1px var(--modal-border)',
    };

    // ── Editor view ──────────────────────────────────────────────────────────
    if (showEditor) {
        return (
            <div className="fixed inset-0 z-[110] flex items-center justify-center backdrop-blur-sm" style={overlayStyle}>
                <div className="relative w-full max-w-md overflow-hidden rounded-2xl border shadow-2xl" style={panelBase}>
                    {errorMessage && (
                        <div className="px-4 py-2 text-xs border-b" style={{
                            color: '#ef4444',
                            borderColor: 'color-mix(in srgb, #ef4444 20%, var(--modal-border))',
                            background: 'color-mix(in srgb, #ef4444 7%, var(--modal-bg))',
                        }}>
                            {errorMessage}
                        </div>
                    )}
                    <Editor
                        initial={editing || {}}
                        onCancel={closeEditor}
                        onSave={async (payload) => {
                            try {
                                const saved = await upsertPersonality(payload);
                                setPersonalities((prev) => {
                                    const exists = prev.find((x) => x.id === saved.id);
                                    return exists ? prev.map((x) => (x.id === saved.id ? saved : x)) : [saved, ...prev];
                                });
                                closeEditor();
                            } catch {
                                setErrorMessage('Failed to save personality. Please try again.');
                            }
                        }}
                        currentModelId={currentModelId}
                        currentModelName={currentModelName}
                    />
                </div>
            </div>
        );
    }

    // ── Browse view ──────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-[110] flex items-center justify-center backdrop-blur-sm" style={overlayStyle}>
            <div
                className="flex w-full w-[94vw] max-w-6xl overflow-hidden rounded-2xl border shadow-2xl"
                style={{ height: '90vh', maxHeight: '900px', ...panelBase }}
            >
                {/* Sidebar */}
                <aside
                    className="w-52 border-r shrink-0 flex flex-col overflow-y-auto"
                    style={{ borderColor: 'var(--modal-border)', background: 'var(--sidebar-bg)' }}
                >
                    <div className="flex flex-col p-2.5 gap-0.5">
                        <div className="px-2.5 pt-2 pb-1.5">
                            <span className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: 'var(--sidebar-muted-fg)' }}>
                                Personalities
                            </span>
                        </div>
                        <div className="flex flex-col gap-0.5">
                            {([
                                { id: 'browse' as ViewTab, label: 'Browse All', emoji: '🌐' },
                                { id: 'mine' as ViewTab, label: 'My Personalities', emoji: '✨' },
                            ]).map((tab) => (
                                <button
                                    key={tab.id}
                                    type="button"
                                    onClick={() => setActiveTab(tab.id)}
                                    className={`app-tab-pill flex items-center gap-2.5 py-1.5 px-2.5 text-xs w-full text-left transition-colors ${activeTab === tab.id ? 'app-tab-pill--active' : ''}`}
                                >
                                    <span className="text-sm shrink-0 leading-none">{tab.emoji}</span>
                                    <span className="truncate">{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        <div className="my-1.5 mx-1 border-t" style={{ borderColor: 'var(--modal-border)' }} />

                        <button
                            type="button"
                            onClick={() => openEditor()}
                            className="app-tab-pill flex items-center gap-2.5 py-1.5 px-2.5 text-xs w-full text-left transition-colors"
                        >
                            <FiPlus size={15} className="shrink-0" style={{ color: 'var(--chat-accent)' }} />
                            <span className="truncate font-semibold" style={{ color: 'var(--chat-accent)' }}>
                                New Personality
                            </span>
                        </button>
                    </div>
                </aside>

                {/* Main content */}
                <main className="flex-1 flex flex-col min-w-0 overflow-hidden" style={{ background: 'var(--modal-bg)' }}>
                    {/* Header */}
                    <div className="flex-shrink-0 border-b px-4 py-3" style={{ borderColor: 'var(--modal-border)' }}>
                        <div className="flex justify-between items-start gap-3">
                            <div className="min-w-0 flex-1">
                                <h2 className="text-lg font-bold tracking-tight mt-0.5" style={{ color: 'var(--modal-fg)' }}>
                                    {activeTab === 'mine'
                                        ? t('modals.personalitiesMine', 'My Personalities')
                                        : t('modals.personalitiesAll', 'All Personalities')}
                                </h2>
                                <p className="text-xs mt-0.5" style={{ color: 'var(--modal-muted-fg)' }}>
                                    {activeTab === 'mine'
                                        ? t('modals.personalitiesMineHint', "Personalities you've created and can edit.")
                                        : t('modals.personalitiesAllHint', 'Browse and activate any AI personality for your chat.')}
                                </p>
                            </div>
                            <div className="flex items-center gap-2 shrink-0">
                                <button
                                    type="button"
                                    onClick={() => openEditor()}
                                    className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-88"
                                    style={{ background: 'var(--chat-accent)', color: 'var(--chat-canvas-bg)' }}
                                >
                                    <FiPlus size={14} strokeWidth={2.5} />
                                    New
                                </button>
                                <button
                                    type="button"
                                    className="h-7 w-7 rounded-lg flex items-center justify-center transition-colors hover:bg-black/5 dark:hover:bg-white/10"
                                    style={{ color: 'var(--modal-muted-fg)' }}
                                    onClick={onClose}
                                    aria-label="Close"
                                >
                                    <FiX size={16} strokeWidth={2} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Search */}
                    <div
                        className="sticky top-0 z-10 border-b px-4 py-2"
                        style={{ borderColor: 'var(--modal-border)', background: 'var(--modal-bg-muted)' }}
                    >
                        <div className="relative flex items-center max-w-sm">
                            <FiSearch
                                size={13}
                                className="absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none"
                                style={{ color: 'var(--modal-muted-fg)' }}
                            />
                            <input
                                type="text"
                                placeholder="Search personalities…"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="app-modal-input rounded-lg pl-7 pr-6 text-xs h-7 w-full"
                            />
                            {search && (
                                <button
                                    onClick={() => setSearch('')}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 p-0.5 rounded hover:bg-black/5 dark:hover:bg-white/10"
                                    style={{ color: 'var(--modal-muted-fg)' }}
                                    title="Clear"
                                >
                                    <FiX size={12} />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Error banner */}
                    {errorMessage && (
                        <div className="px-4 py-2 text-xs border-b shrink-0" style={{
                            color: '#ef4444',
                            borderColor: 'color-mix(in srgb, #ef4444 20%, var(--modal-border))',
                            background: 'color-mix(in srgb, #ef4444 7%, var(--modal-bg))',
                        }}>
                            {errorMessage}
                        </div>
                    )}

                    {/* Content grid */}
                    <div className="flex-1 overflow-y-auto px-4 py-3">
                        {filtered.length === 0 ? (
                            <div className="flex flex-col items-center justify-center gap-3 py-16 text-center">
                                <span className="text-3xl select-none">🎭</span>
                                <div>
                                    <p className="text-xs font-medium" style={{ color: 'var(--modal-fg)' }}>
                                        {search ? 'No results found' : activeTab === 'mine' ? 'No personalities yet' : 'No personalities available'}
                                    </p>
                                    <p className="text-[11px] mt-0.5" style={{ color: 'var(--modal-muted-fg)' }}>
                                        {search ? 'Try a different search term.' : 'Create your first personality to get started.'}
                                    </p>
                                </div>
                                {!search && (
                                    <button
                                        type="button"
                                        onClick={() => openEditor()}
                                        className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg transition-opacity hover:opacity-88 mt-1"
                                        style={{ background: 'var(--chat-accent)', color: 'var(--chat-canvas-bg)' }}
                                    >
                                        <FiPlus size={13} strokeWidth={2.5} />
                                        Create Personality
                                    </button>
                                )}
                            </div>
                        ) : (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                {filtered.map((p) => (
                                    <PersonalityCard
                                        key={p.id}
                                        p={p}
                                        isCreator={isCreator(p)}
                                        onSelect={() => onSelect(p)}
                                        onEdit={() => openEditor(p)}
                                        onDelete={async () => {
                                            try {
                                                await deletePersonality(p.id);
                                                setPersonalities((prev) => prev.filter((x) => x.id !== p.id));
                                                setErrorMessage(null);
                                            } catch {
                                                setErrorMessage('Failed to delete personality. Please try again.');
                                            }
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                        <div className="h-4" />
                    </div>
                </main>
            </div>
        </div>
    );
}
