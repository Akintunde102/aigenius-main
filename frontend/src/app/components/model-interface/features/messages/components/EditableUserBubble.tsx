'use client';

import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import { ChatBoxInput } from '@/app/components/ChatBoxInput';
import type { UploadedFileInfo } from '@/app/components/ChatBoxInput/types';
import type { Model } from '@/app/components/model-interface/shared/types';
import { customUpload } from '@/app/components/model-interface/features/file-upload/services';
import type { EditAttachment, MessageEditDraft } from '../utils/messageEdit.utils';
import { isEditDraftSubmittable } from '../utils/messageEdit.utils';

export interface EditableUserBubbleProps {
    draft: MessageEditDraft;
    onDraftChange: (draft: MessageEditDraft) => void;
    onCommit: () => void;
    onCancel: () => void;
    conversationId?: string | null;
    disabled?: boolean;
    selectedModel: Model;
    models: Model[];
    supportsFileUpload?: boolean;
}

function attachmentsToUploadedFiles(attachments: EditAttachment[]): UploadedFileInfo[] {
    return attachments.map((attachment) => ({
        fileUrl: attachment.fileUrl,
        isImage: attachment.isImage,
        displayName: attachment.displayName,
        mimeType: attachment.mimeType,
        source: 'library',
    }));
}

export function EditableUserBubble({
    draft,
    onDraftChange,
    onCommit,
    onCancel,
    conversationId,
    disabled = false,
    selectedModel,
    models,
    supportsFileUpload = true,
}: EditableUserBubbleProps) {
    const draftRef = useRef(draft);
    draftRef.current = draft;

    const uploadedFiles = useMemo(
        () => attachmentsToUploadedFiles(draft.attachments),
        [draft.attachments],
    );

    useEffect(() => {
        const timer = window.setTimeout(() => {
            document.getElementById('message-edit-composer-textarea')?.focus();
        }, 0);
        return () => window.clearTimeout(timer);
    }, []);

    const handleComposerKeyDown = useCallback((event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Escape') {
            event.preventDefault();
            onCancel();
        }
    }, [onCancel]);

    const commitDraft = useCallback((next: MessageEditDraft) => {
        draftRef.current = next;
        onDraftChange(next);
    }, [onDraftChange]);

    const handleInputChange = useCallback((text: string) => {
        commitDraft({ ...draftRef.current, text });
    }, [commitDraft]);

    const handleSendMessage = useCallback(async (message: string) => {
        const nextDraft = { ...draftRef.current, text: message };
        commitDraft(nextDraft);
        if (!isEditDraftSubmittable(nextDraft) || disabled) {
            return false;
        }
        onCommit();
        return true;
    }, [commitDraft, disabled, onCommit]);

    const handleRemoveUploadedFile = useCallback((index: number) => {
        commitDraft({
            ...draftRef.current,
            attachments: draftRef.current.attachments.filter((_, i) => i !== index),
        });
    }, [commitDraft]);

    const handleFileUpload = useCallback((file: File) => {
        if (disabled) return;

        customUpload({
            file,
            conversationId: conversationId ?? undefined,
            onStarted: () => {},
            onProgress: () => {},
            onSuccess: (result) => {
                const fileUrl = result.fileUrl ?? result.s3Link;
                if (!fileUrl) return;

                const isImage = file.type.startsWith('image/')
                    || /\.(jpe?g|png|gif|webp|bmp|svg)$/i.test(file.name);

                const current = draftRef.current;
                if (current.attachments.some((attachment) => attachment.fileUrl === fileUrl)) {
                    return;
                }
                commitDraft({
                    ...current,
                    attachments: [
                        ...current.attachments,
                        {
                            fileUrl,
                            isImage,
                            displayName: file.name,
                            mimeType: file.type || undefined,
                        },
                    ],
                });
            },
            onError: () => {},
        });
    }, [commitDraft, conversationId, disabled]);

    return (
        <ChatBoxInput
            className="!mx-0"
            inputValue={draft.text}
            onInputChange={handleInputChange}
            onSendMessage={handleSendMessage}
            onFileUpload={handleFileUpload}
            uploadedFiles={uploadedFiles}
            onRemoveUploadedFile={handleRemoveUploadedFile}
            selectedModel={selectedModel}
            models={models}
            onModelChange={() => {}}
            hideModelSelector
            hideUpload={false}
            sidebarStyle
            compact
            supportsFileUpload={supportsFileUpload}
            uploading={false}
            responseInProgress={disabled}
            onComposerKeyDown={handleComposerKeyDown}
            composerTextareaId="message-edit-composer-textarea"
            composerRootId="message-edit-input"
            placeholder="Edit message..."
        />
    );
}
