import React, { useCallback } from 'react';
import copy from 'copy-to-clipboard';
import { ChatMessage } from '@/app/components/model-interface/shared/types';
import { scheduleNextTick } from '@/app/components/model-interface/ModelInterface.helpers';

interface MessageHandlersProps {
    children: (handlers: {
        handleDeleteMessage: (idx: number) => void;
        handleDeleteMessageById: (id: string) => void;
        handleReplayMessage: (message: ChatMessage, idx: number) => void;
        handleCopyMessage: (content: string) => void;
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
    setLoading?: (loading: boolean) => void;
    handleStop?: () => void;
}

export function MessageHandlers({
    children,
    chat,
    setChat,
    handleSend,
    viewSessionId = null,
    updateSessionMessages,
    setLoading,
    handleStop,
}: MessageHandlersProps) {

    const handleDeleteMessage = useCallback((idx: number) => {
        setChat(prev => {
            const newChat = [...prev];
            if (idx >= 0 && idx < newChat.length) {
                const messageToDelete = newChat[idx];
                if (messageToDelete) {
                    newChat.splice(idx, 1);
                } else {
                    console.warn(`No message found at index ${idx}`);
                }
            } else {
                console.warn(`Invalid index ${idx} for deletion. Array length: ${newChat.length}`);
            }
            return newChat;
        });
    }, [setChat]);

    const handleDeleteMessageById = useCallback((id: string) => {
        setChat(prev => {
            const newChat = prev.filter(msg => msg.id !== id);
            if (newChat.length === prev.length) {
                console.warn(`No message found with id ${id}`);
                const messageToDelete = prev.find(msg => !msg.id && msg.timestamp.toString() === id);
                if (messageToDelete) {
                    return prev.filter(msg => msg !== messageToDelete);
                }
            }
            return newChat;
        });
    }, [setChat]);

    const handleReplayMessage = useCallback((message: ChatMessage, idx: number) => {
        if (message.role !== 'user' || idx < 0 || idx >= chat.length) return;

        // Stop any in-flight generation and block passive server sync before truncating.
        handleStop?.();
        setLoading?.(true);

        const nextChat = chat.slice(0, idx + 1);
        setChat(nextChat);

        if (viewSessionId && updateSessionMessages) {
            updateSessionMessages(viewSessionId, nextChat);
        }

        scheduleNextTick(() => handleSend(undefined, undefined, message, nextChat));
    }, [
        chat,
        setChat,
        handleSend,
        viewSessionId,
        updateSessionMessages,
        setLoading,
        handleStop,
    ]);

    const handleCopyMessage = useCallback((content: string) => {
        copy(content);
    }, []);

    return <>{children({ handleDeleteMessage, handleDeleteMessageById, handleReplayMessage, handleCopyMessage })}</>;
} 
