import React, { useState, useEffect } from 'react';
import { FiLoader, FiCheck } from 'react-icons/fi';
import toast from 'react-hot-toast';
import type { ChatSession } from '@/app/components/model-interface/shared/types';
import type { ConversationLabel } from '@/lib/calls/model-chat-conversation';
import { AppModal, AppModalBody, AppModalHeader } from '@/app/components/modals/AppModal';

interface AssignLabelsModalProps {
    isOpen: boolean;
    session: ChatSession | null;
    catalog: ConversationLabel[];
    onClose: () => void;
    onSave: (sessionId: string, labelIds: string[]) => Promise<void>;
    onOpenLabelsSettings?: () => void;
}

export const AssignLabelsModal: React.FC<AssignLabelsModalProps> = ({
    isOpen,
    session,
    catalog,
    onClose,
    onSave,
    onOpenLabelsSettings,
}) => {
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [isSaving, setIsSaving] = useState(false);

    useEffect(() => {
        if (session) {
            setSelectedIds(new Set(session.labelIds ?? []));
        }
    }, [session]);

    if (!session) return null;

    const toggleLabel = (labelId: string) => {
        setSelectedIds((prev) => {
            const next = new Set(prev);
            if (next.has(labelId)) {
                next.delete(labelId);
            } else {
                next.add(labelId);
            }
            return next;
        });
    };

    const handleSave = async () => {
        if (!session.id) return;
        setIsSaving(true);
        try {
            await onSave(session.id, Array.from(selectedIds));
            onClose();
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'Failed to update labels';
            toast.error(message);
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <AppModal
            open={isOpen}
            onClose={onClose}
            size="sm"
            ariaLabelledBy="assign-labels-title"
            className="z-[110]"
            closeOnOverlayClick={!isSaving}
            closeOnEscape={!isSaving}
        >
            <AppModalHeader
                titleId="assign-labels-title"
                title="Assign Labels"
                onClose={onClose}
            />
            <AppModalBody>
                <p className="mb-3 truncate text-xs" style={{ color: "var(--modal-muted-fg)" }}>
                    {session.title || "Untitled chat"}
                </p>

                {catalog.length === 0 ? (
                    <div className="py-6 text-center text-xs" style={{ color: "var(--modal-muted-fg)" }}>
                        <p>No labels created yet.</p>
                        {onOpenLabelsSettings && (
                            <button
                                type="button"
                                onClick={() => {
                                    onClose();
                                    onOpenLabelsSettings();
                                }}
                                className="mt-2 text-xs font-medium transition-opacity hover:opacity-80"
                                style={{ color: "var(--chat-accent)" }}
                            >
                                Manage labels in Settings
                            </button>
                        )}
                    </div>
                ) : (
                    <div className="max-h-60 space-y-1.5 overflow-y-auto pr-1">
                        {catalog.map((label) => {
                            const isChecked = selectedIds.has(label.id);
                            return (
                                <button
                                    key={label.id}
                                    type="button"
                                    onClick={() => toggleLabel(label.id)}
                                    className="flex w-full items-center justify-between rounded-lg px-2.5 py-2 text-left text-xs transition"
                                    style={{
                                        backgroundColor: isChecked
                                            ? "color-mix(in srgb, var(--chat-accent) 12%, transparent)"
                                            : "transparent",
                                    }}
                                >
                                    <div className="flex min-w-0 items-center gap-2.5">
                                        <span
                                            className="h-3 w-3 shrink-0 rounded-full shadow-xs"
                                            style={{ backgroundColor: label.color }}
                                        />
                                        <span className="truncate font-medium" style={{ color: "var(--modal-fg)" }}>
                                            {label.name}
                                        </span>
                                    </div>
                                    <div
                                        className="flex h-4 w-4 shrink-0 items-center justify-center rounded border transition"
                                        style={{
                                            borderColor: isChecked ? "var(--chat-accent)" : "var(--modal-border)",
                                            background: isChecked ? "var(--chat-accent)" : "transparent",
                                            color: isChecked ? "var(--chat-canvas-bg)" : "transparent",
                                        }}
                                    >
                                        {isChecked && <FiCheck size={12} strokeWidth={3} />}
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                )}
            </AppModalBody>

            <div
                className="flex items-center justify-end gap-2 border-t px-5 py-3"
                style={{ borderColor: "var(--modal-border)" }}
            >
                <button
                    type="button"
                    onClick={onClose}
                    disabled={isSaving}
                    className="rounded-lg border px-3 py-1.5 text-xs transition hover:opacity-80"
                    style={{
                        background: "transparent",
                        borderColor: "var(--modal-border)",
                        color: "var(--modal-muted-fg)",
                    }}
                >
                    Cancel
                </button>
                <button
                    type="button"
                    onClick={handleSave}
                    disabled={isSaving}
                    className="app-modal-btn-primary flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-medium disabled:opacity-50"
                >
                    {isSaving && <FiLoader size={12} className="animate-spin" />}
                    Save
                </button>
            </div>
        </AppModal>
    );
};
