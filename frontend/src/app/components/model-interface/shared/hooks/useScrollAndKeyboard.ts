import { useEffect, useRef } from 'react';
import { ChatMessage } from '@/app/components/model-interface/shared/types';

interface UseScrollAndKeyboardProps {
    chat: ChatMessage[];
    loading: boolean;
    streaming: boolean;
    input: string;
    setShowScrollToBottom: React.Dispatch<React.SetStateAction<boolean>>;
    setShowTyping: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useScrollAndKeyboard({
    chat,
    loading,
    streaming,
    input,
    setShowScrollToBottom,
    setShowTyping
}: UseScrollAndKeyboardProps) {
    // Refs
    const chatEndRef = useRef<HTMLDivElement>(null);
    const chatAreaRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement | null>(null);
    const previousChatLengthRef = useRef(0);

    // Auto-scroll effect
    useEffect(() => {
        if (chat.length === 0 || !chatEndRef.current) {
            previousChatLengthRef.current = chat.length;
            return;
        }
        const chatArea = chatAreaRef.current || (chatEndRef.current.parentElement as HTMLElement | null);
        if (!chatArea) {
            previousChatLengthRef.current = chat.length;
            return;
        }

        const latestMessage = chat[chat.length - 1];
        const didAppendMessage = chat.length > previousChatLengthRef.current;
        const sentNewUserMessage = didAppendMessage && latestMessage?.role === 'user';

        // Force-position a freshly sent user message near the top of the viewport
        // so the next assistant message has room to appear right below it.
        if (sentNewUserMessage) {
            const sentMessageNode = chatArea.querySelector<HTMLElement>(
                `[data-chat-message-index="${chat.length - 1}"]`,
            );
            if (sentMessageNode) {
                const topOffset = Math.round(chatArea.clientHeight * 0.24);
                const targetScrollTop = Math.max(0, sentMessageNode.offsetTop - topOffset);
                setTimeout(() => {
                    chatArea.scrollTo({ top: targetScrollTop, behavior: 'smooth' });
                }, 60);
                previousChatLengthRef.current = chat.length;
                return;
            }
        }

        const isNearBottom = () => {
            return chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight < 60;
        };

        if (!isNearBottom()) {
            previousChatLengthRef.current = chat.length;
            return;
        }

        setTimeout(() => {
            const el = chatEndRef.current;
            if (!el) return;
            el.scrollIntoView({ behavior: "smooth" });
            if (el.parentElement) {
                el.parentElement.scrollTop += 40;
            }
        }, 100);
        previousChatLengthRef.current = chat.length;
    }, [chat, loading]);

    const lastMessageRole = chat.length > 0 ? chat[chat.length - 1].role : null;
    useEffect(() => {
        if ((loading && lastMessageRole === 'user') ||
            (loading && streaming) ||
            streaming) {
            setShowTyping(true);
        } else {
            setShowTyping(false);
        }
    }, [loading, streaming, chat.length, lastMessageRole, setShowTyping]);

    // Scroll detection for show scroll to bottom button (re-run when message count changes so refs are updated)
    useEffect(() => {
        const chatArea = chatAreaRef.current;
        if (!chatArea) return;

        const handleScroll = () => {
            const atBottom = chatArea.scrollHeight - chatArea.scrollTop - chatArea.clientHeight < 40;
            setShowScrollToBottom(!atBottom);
        };

        chatArea.addEventListener('scroll', handleScroll);
        handleScroll();
        return () => chatArea.removeEventListener('scroll', handleScroll);
    }, [chat.length, setShowScrollToBottom]);

    // Auto-resize input
    useEffect(() => {
        if (!inputRef.current) return;
        const el = inputRef.current;
        el.style.height = 'auto';
        el.style.height = Math.min(el.scrollHeight, 200) + 'px';
    }, [input]);

    // Enter = new line; Shift+Enter = send (caller should submit when true)
    const handleInputKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && e.shiftKey) {
            e.preventDefault();
            return true;
        }
        return false;
    };

    return {
        chatEndRef,
        chatAreaRef,
        inputRef,
        handleInputKeyDown
    };
}
