import React, { useCallback, useRef, useState } from 'react';
import copy from 'copy-to-clipboard';
import { ChatMessage } from '@/app/components/model-interface/shared/types';
import { scheduleNextTick } from '@/app/components/model-interface/ModelInterface.helpers';
import {
    buildEditedUserMessage,
    isEditDraftSubmittable,
    parseMessageForEdit,
    type MessageEditDraft,
} from '../utils/messageEdit.utils';

interface MessageHandlersProps {
    children: (handlers: {
        handleDeleteMessage: (idx: number) => void;
        handleDeleteMessageById: (id: string) => void;
        handleReplayMessage: (message: ChatMessage, idx: number) => void;
        handleCopyMessage: (content: string) => void;
        editingIdx: number | null;
        editDraft: MessageEditDraft | null;
        handleStartEditMessage: (message: ChatMessage, idx: number) => void;
        handleCancelEditMessage: () => void;
        handleUpdateEditDraft: (draft: MessageEditDraft) => void;
        handleCommitEditMessage: (idx: number) => void;
    }) => React.ReactNode;
    chat: ChatMessage[];
    setChat: (chat: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
    handleSend: (
        input?: string,
        enableStreaming?: boolean,
        preCreatedMessage?: ChatMessage,
        chatSnapshot?: ChatMessage[],
    ) => void;
    chatEndRef: React.RefObject<HTMLDivElement>;
    viewSessionId?: string | null;
    updateSessionMessages?: (sessionId: string, messages: ChatMessage[]) => void;
    persistSessionMessages?: (messages: ChatMessage[]) => void | Promise<void>;
    setLoading?: (loading: boolean) => void;
    handleStop?: () => void;
    loading?: boolean;
    streaming?: boolean;
}

export function MessageHandlers({
    children,
    chat,
    setChat,
    handleSend,
    viewSessionId = null,
    updateSessionMessages,
    persistSessionMessages,
    setLoading,
    handleStop,
    loading = false,
    streaming = false,
}: MessageHandlersProps) {
    const [editingIdx, setEditingIdx] = useState<number | null>(null);
    const [editDraft, setEditDraft] = useState<MessageEditDraft | null>(null);
    const editOriginalRef = useRef<MessageEditDraft | null>(null);
    const editingIdxRef = useRef<number | null>(null);
    const editDraftRef = useRef<MessageEditDraft | null>(null);

    editingIdxRef.current = editingIdx;
    editDraftRef.current = editDraft;

    const handleCancelEditMessage = useCallback(() => {
        editingIdxRef.current = null;
        editDraftRef.current = null;
        setEditingIdx(null);
        setEditDraft(null);
        editOriginalRef.current = null;
    }, []);

    const handleStartEditMessage = useCallback((message: ChatMessage, idx: number) => {
        if (message.role !== 'user' || loading || streaming) return;
        if (idx < 0 || idx >= chat.length) return;

        const draft = parseMessageForEdit(message);
        editOriginalRef.current = draft;
        editingIdxRef.current = idx;
        editDraftRef.current = draft;
        setEditingIdx(idx);
        setEditDraft(draft);
    }, [chat.length, loading, streaming]);

    const handleUpdateEditDraft = useCallback((draft: MessageEditDraft) => {
        editDraftRef.current = draft;
        setEditDraft(draft);
    }, []);

    const resendFromIndex = useCallback((
        messageToSend: ChatMessage,
        idx: number,
    ) => {
        handleStop?.();
        setLoading?.(true);

        const nextChat = [...chat.slice(0, idx), messageToSend];
        setChat(nextChat);

        if (viewSessionId && updateSessionMessages) {
            updateSessionMessages(viewSessionId, nextChat);
        }

        scheduleNextTick(() => handleSend(undefined, undefined, messageToSend, nextChat));
    }, [
        chat,
        setChat,
        handleSend,
        viewSessionId,
        updateSessionMessages,
        setLoading,
        handleStop,
    ]);

    const handleCommitEditMessage = useCallback((idx: number) => {
        const activeIdx = editingIdxRef.current;
        const activeDraft = editDraftRef.current;
        if (activeIdx !== idx || !activeDraft) return;
        if (!isEditDraftSubmittable(activeDraft)) return;

        const original = chat[idx];
        if (!original || original.role !== 'user') return;

        const updatedMessage = buildEditedUserMessage(original, activeDraft);
        handleCancelEditMessage();
        resendFromIndex(updatedMessage, idx);
    }, [
        chat,
        handleCancelEditMessage,
        resendFromIndex,
    ]);

    const commitMessageList = useCallback((nextChat: ChatMessage[]) => {
        setChat(nextChat);

        if (viewSessionId && updateSessionMessages) {
            updateSessionMessages(viewSessionId, nextChat);
        }

        if (viewSessionId && persistSessionMessages) {
            void persistSessionMessages(nextChat);
        }
    }, [setChat, viewSessionId, updateSessionMessages, persistSessionMessages]);

    const handleDeleteMessage = useCallback((idx: number) => {
        if (idx < 0 || idx >= chat.length) {
            console.warn(`Invalid index ${idx} for deletion. Array length: ${chat.length}`);
            return;
        }

        const messageToDelete = chat[idx];
        if (!messageToDelete) {
            console.warn(`No message found at index ${idx}`);
            return;
        }

        const nextChat = chat.filter((_, messageIdx) => messageIdx !== idx);
        commitMessageList(nextChat);
    }, [chat, commitMessageList]);

    const handleDeleteMessageById = useCallback((id: string) => {
        let nextChat = chat.filter(msg => msg.id !== id);
        if (nextChat.length === chat.length) {
            console.warn(`No message found with id ${id}`);
            const messageToDelete = chat.find(msg => !msg.id && msg.timestamp.toString() === id);
            if (messageToDelete) {
                nextChat = chat.filter(msg => msg !== messageToDelete);
            }
        }

        if (nextChat.length !== chat.length) {
            commitMessageList(nextChat);
        }
    }, [chat, commitMessageList]);

    const handleReplayMessage = useCallback((message: ChatMessage, idx: number) => {
        if (message.role !== 'user' || idx < 0 || idx >= chat.length) return;

        let messageToSend = message;
        const activeIdx = editingIdxRef.current;
        const activeDraft = editDraftRef.current;
        if (activeIdx === idx && activeDraft && isEditDraftSubmittable(activeDraft)) {
            messageToSend = buildEditedUserMessage(message, activeDraft);
            handleCancelEditMessage();
        }

        resendFromIndex(messageToSend, idx);
    }, [
        chat.length,
        handleCancelEditMessage,
        resendFromIndex,
    ]);

    const handleCopyMessage = useCallback((content: string) => {
        copy(content);
    }, []);

    return (
        <>
            {children({
                handleDeleteMessage,
                handleDeleteMessageById,
                handleReplayMessage,
                handleCopyMessage,
                editingIdx,
                editDraft,
                handleStartEditMessage,
                handleCancelEditMessage,
                handleUpdateEditDraft,
                handleCommitEditMessage,
            })}
        </>
    );
}
