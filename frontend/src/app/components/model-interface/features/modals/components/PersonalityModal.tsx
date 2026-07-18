import React, { useEffect, useMemo, useState } from 'react';
import { FiX } from 'react-icons/fi';
import { listPersonalities, upsertPersonality, deletePersonality, Personality } from '@/lib/calls/model-chat-conversation';
import { uploadFile } from '@/lib/calls/upload-file';
import type { CloudFile } from '@/app/components/file/file.interface';

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

export function PersonalityModal({ isOpen, onClose, onSelect, currentModelId, currentModelName, personalities, setPersonalities, currentUser }: PersonalityModalProps) {
    const [search, setSearch] = useState('');
    const [showEditor, setShowEditor] = useState(false);
    const [editing, setEditing] = useState<Partial<Personality> | null>(null);
    const [errorMessage, setErrorMessage] = useState<string | null>(null);



    const filtered = useMemo(() => {
        const t = search.toLowerCase();
        return personalities.filter(p => p.name.toLowerCase().includes(t) || (p.description || '').toLowerCase().includes(t));
    }, [personalities, search]);

    // Check if current user is the creator of a personality
    const isCreator = (personality: Personality) => {
        return currentUser && personality.userId === currentUser.id;
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/20 backdrop-blur-sm">
            <div
                className="rounded-xl shadow-2xl w-full max-w-4xl h-[80vh] overflow-hidden border backdrop-blur-xl flex flex-col"
                style={{
                    background: "var(--modal-bg)",
                    borderColor: "var(--modal-border)",
                    color: "var(--modal-fg)",
                }}
            >
                {/* Header */}
                <div className="flex items-center justify-between px-4 py-2 border-b" style={{ borderColor: "var(--modal-border)" }}>
                    <h2 className="text-lg font-bold">Select Personality</h2>
                    <div className="flex items-center gap-2">
                        <button
                            className="px-3 py-1 rounded bg-blue-600 text-white text-sm font-semibold shadow hover:bg-blue-700"
                            onClick={() => { setErrorMessage(null); setEditing({}); setShowEditor(true); }}
                        >
                            New
                        </button>
                        <button className="hover:text-red-500 transition-colors" onClick={onClose} style={{ color: "var(--modal-muted-fg)" }}><FiX size={20} /></button>
                    </div>
                </div>

                {/* Search */}
                <div className="p-3 border-b" style={{ borderColor: "var(--modal-border)" }}>
                    <input
                        className="app-modal-input w-full rounded-full focus:outline-none px-3 py-1.5 text-xs"
                        placeholder="Search personalities..."
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                {/* List (match ModelSelectionFeaturedCard look & feel) */}
                <div className="overflow-y-auto p-3 grid grid-cols-1 md:grid-cols-3 gap-3">
                    {filtered.map(p => (
                        <div
                            key={p.id}
                            className="group cursor-pointer border rounded-lg shadow-sm hover:shadow-md transition-shadow overflow-hidden h-[160px]"
                            onClick={() => onSelect(p)}
                            style={{
                                background: "var(--modal-bg-muted)",
                                borderColor: "var(--modal-border)",
                            }}
                        >
                            <div className="flex flex-col h-full p-3">
                                {/* Header with actions */}
                                <div className="flex items-start justify-between mb-2">
                                    <div className="flex items-center gap-2 min-w-0">
                                        <div className="w-6 h-6 rounded bg-gray-200/20 flex items-center justify-center text-xs overflow-hidden shrink-0">
                                            {p.icon
                                                ? (p.icon.startsWith('http') || p.icon.startsWith('data:')
                                                    ? <img
                                                        src={p.icon}
                                                        alt="icon"
                                                        className="w-6 h-6 object-cover"
                                                        width={24}
                                                        height={24}
                                                        loading="lazy"
                                                        decoding="async"
                                                    />
                                                    : <span className="text-base">{p.icon}</span>)
                                                : '🎭'}
                                        </div>
                                        <div className="flex flex-col min-w-0">
                                            <span className="font-bold text-sm leading-tight truncate">{p.name}</span>
                                            {p.creator && (
                                                <span className="text-xs truncate" style={{ color: "var(--modal-muted-fg)" }}>
                                                    by {p.creator.firstName} {p.creator.lastName || ''}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    {isCreator(p) && (
                                        <div className="flex items-center gap-2 shrink-0">
                                            <button
                                                className="flex items-center justify-center border bg-transparent rounded-md p-1.5 hover:bg-blue-50/10 transition-all duration-150 text-blue-500 text-xs"
                                                style={{ borderColor: "var(--modal-border)" }}
                                                onClick={(e) => { e.stopPropagation(); setEditing(p); setShowEditor(true); }}
                                            >Edit</button>
                                            <button
                                                className="flex items-center justify-center border bg-transparent rounded-md p-1.5 hover:bg-red-50/10 transition-all duration-150 text-red-500 text-xs"
                                                style={{ borderColor: "var(--modal-border)" }}
                                                onClick={async (e) => {
                                                    e.stopPropagation();
                                                    try {
                                                        await deletePersonality(p.id);
                                                        setPersonalities(prev => prev.filter(x => x.id !== p.id));
                                                        setErrorMessage(null);
                                                    } catch (error) {
                                                        setErrorMessage('Failed to delete personality. Please try again.');
                                                    }
                                                }}
                                            >Delete</button>
                                        </div>
                                    )}
                                </div>

                                {/* Main Content */}
                                <div className="flex-1 min-w-0">
                                    {p.description && (
                                        <div className="text-xs leading-tight line-clamp-2" style={{ color: "var(--modal-muted-fg)" }}>{p.description}</div>
                                    )}
                                    <div className="text-[11px] line-clamp-2 whitespace-pre-wrap mt-1 opacity-70">{p.prompt}</div>
                                </div>

                                {/* Footer */}
                                <div className="flex items-center justify-between mt-2">
                                    <div className="flex items-center gap-1">
                                        {isCreator(p) && (
                                            <span className="text-xs text-blue-500 bg-blue-500/10 px-2 py-1 rounded">Your creation</span>
                                        )}
                                    </div>
                                    <button className="px-2 py-1 rounded bg-blue-600 text-white text-xs" onClick={(e) => { e.stopPropagation(); onSelect(p); }}>Use</button>
                                </div>
                            </div>
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="text-sm" style={{ color: "var(--modal-muted-fg)" }}>No personalities yet. Create one.</div>
                    )}
                </div>
                {errorMessage && (
                    <div className="px-3 pb-2 text-sm text-red-500">{errorMessage}</div>
                )}

                {/* Editor Drawer */}
                {showEditor && (
                    <div className="absolute inset-x-0 bottom-0 border-t p-2 shadow-xl" style={{ background: "var(--modal-bg)", borderColor: "var(--modal-border)" }}>
                        <Editor
                            initial={editing || {}}
                            onCancel={() => { setErrorMessage(null); setShowEditor(false); setEditing(null); }}
                            onSave={async (payload) => {
                                try {
                                    const saved = await upsertPersonality(payload);
                                    setPersonalities(prev => {
                                        const exists = prev.find(x => x.id === saved.id);
                                        if (exists) return prev.map(x => x.id === saved.id ? saved : x);
                                        return [saved, ...prev];
                                    });
                                    setErrorMessage(null);
                                    setShowEditor(false);
                                    setEditing(null);
                                } catch (error) {
                                    setErrorMessage('Failed to save personality. Please try again.');
                                }
                            }}
                            currentModelId={currentModelId}
                            currentModelName={currentModelName}
                        />
                    </div>
                )}
            </div>
        </div>
    );
}

function Editor({ initial, onCancel, onSave, currentModelId, currentModelName }: { initial: Partial<Personality>; onCancel: () => void; onSave: (p: { id?: string; name: string; description?: string; prompt: string; icon?: string; modelId?: string }) => void; currentModelId?: string; currentModelName?: string; }) {
    const [name, setName] = useState(initial.name || '');
    const [description, setDescription] = useState(initial.description || '');
    const [prompt, setPrompt] = useState(initial.prompt || '');
    const [icon, setIcon] = useState(initial.icon || '');
    const [uploading, setUploading] = useState(false);
    const [uploadPercent, setUploadPercent] = useState(0);
    const [modelId, setModelId] = useState<string>(initial.modelId as string || currentModelId || '');
    const [modelName, setModelName] = useState<string>(
        initial.modelId && initial.modelId !== currentModelId ? (initial.modelId as string) : (currentModelName || currentModelId || '')
    );


    // Reactively update when a model is picked from the ModelSelectionModal
    useEffect(() => {
        const handler = (event: Event) => {
            const detail = (event as CustomEvent<{ modelId?: string; modelName?: string }>).detail || {};
            if (detail.modelId) setModelId(detail.modelId);
            const pickedModelName = detail.modelName ?? detail.modelId;
            if (pickedModelName) setModelName(pickedModelName);
        };
        if (typeof window !== 'undefined') {
            window.addEventListener('model-picked', handler as EventListener);
        }
        return () => {
            if (typeof window !== 'undefined') {
                window.removeEventListener('model-picked', handler as EventListener);
            }
        };
    }, []);

    const handleIconFile = async (file: File) => {
        if (!file) return;
        setUploading(true);
        setUploadPercent(0);
        try {
            await uploadFile({
                file,
                onProgress: ({ percent }) => setUploadPercent(percent),
                onSuccess: (data: CloudFile) => {
                    setIcon(data.s3Link);
                    setUploading(false);
                },
                onError: () => {
                    setUploading(false);
                }
            });
        } catch {
            setUploading(false);
        }
    };

    return (
        <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
                <div className="font-semibold">{initial?.id ? 'Edit Personality' : 'Create Personality'}</div>
                <div className="flex items-center gap-2">
                    <button className="text-sm hover:opacity-85 transition-opacity" onClick={onCancel} style={{ color: "var(--modal-muted-fg)" }}>Cancel</button>
                    <button
                        className="px-2.5 py-1 rounded bg-blue-600 text-white text-sm font-semibold"
                        onClick={() => onSave({ id: initial.id, name, description, prompt, icon })}
                        disabled={!name || !prompt}
                    >Save</button>
                </div>
            </div>
            {/* Row 1: Name and Description */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                    <div className="text-xs mb-1" style={{ color: "var(--modal-muted-fg)" }}>Name</div>
                    <input className="app-modal-input w-full rounded px-2 py-1 text-xs focus:outline-none" value={name} onChange={e => setName(e.target.value)} />
                </div>
                <div>
                    <div className="text-xs mb-1" style={{ color: "var(--modal-muted-fg)" }}>Description (optional)</div>
                    <input className="app-modal-input w-full rounded px-2 py-1 text-xs focus:outline-none" value={description} onChange={e => setDescription(e.target.value)} />
                </div>
            </div>
            {/* Row 2: Icon and Default Model */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                <div>
                    <div className="text-xs mb-1" style={{ color: "var(--modal-muted-fg)" }}>Icon (optional)</div>
                    <div className="flex items-center gap-2">
                        <input className="app-modal-input flex-1 rounded px-2 py-1 text-xs focus:outline-none" value={icon} onChange={e => setIcon(e.target.value)} placeholder="e.g. 🎯 or https://..." />
                        <input
                            type="file"
                            accept="image/*"
                            onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleIconFile(f);
                            }}
                            className="text-xs shrink-0"
                        />
                        {(icon?.startsWith('http') || icon?.startsWith('data:')) && (
                            <img
                                src={icon}
                                alt="icon preview"
                                className="w-6 h-6 rounded object-cover border"
                                width={24}
                                height={24}
                                loading="lazy"
                                decoding="async"
                                style={{ borderColor: "var(--modal-border)" }}
                            />
                        )}
                    </div>
                    {uploading && (
                        <div className="mt-1 text-[11px]" style={{ color: "var(--modal-muted-fg)" }}>Uploading {uploadPercent}%</div>
                    )}
                </div>
                <div className="max-w-xs">
                    <div className="text-xs mb-1" style={{ color: "var(--modal-muted-fg)" }}>Default Model <span className="text-red-500">*</span></div>
                    <button
                        type="button"
                        className="w-full px-2.5 py-1.5 rounded border text-xs hover:bg-blue-50/5 text-left flex items-center justify-between"
                        style={{ background: "var(--modal-bg)", borderColor: "var(--modal-border)", color: "var(--modal-fg)" }}
                        onClick={() => {
                            const evt = new CustomEvent('request-model-pick', { detail: {} });
                            window.dispatchEvent(evt);
                        }}
                    >
                        <span style={{ color: "var(--modal-muted-fg)" }}>Pick Model:</span>
                        <span className="font-semibold truncate max-w-[70%]">
                            {modelName || modelId || 'Select from list'}
                        </span>
                    </button>
                </div>
            </div>
            <div>
                <div className="text-xs mb-1" style={{ color: "var(--modal-muted-fg)" }}>System Prompt</div>
                <textarea className="app-modal-input w-full rounded px-2 py-1 text-xs min-h-[96px] focus:outline-none" value={prompt} onChange={e => setPrompt(e.target.value)} placeholder="Write the system prompt that defines this personality..." />
            </div>
            <div className="flex justify-end">
                <button
                    className="px-2.5 py-1 rounded bg-blue-600 text-white text-sm font-semibold"
                    onClick={() => onSave({ id: initial.id, name, description, prompt, icon, modelId })}
                    disabled={!name || !prompt || !modelId}
                >Save</button>
            </div>
        </div>
    );
}

// Removed legacy DOM listener in favor of React state updates
