import { useState, useRef, useEffect } from 'react';
import { ChatMessage, ChatSession } from '@/app/components/model-interface/shared/types';
import { USD_TO_NGN } from '@/app/components/model-interface/shared/utils';

export function useChatState() {
    const [chat, setChat] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [streaming, setStreaming] = useState(false);
    const [showTyping, setShowTyping] = useState(false);
    const [totalSpent, setTotalSpent] = useState(0);

    const chatEndRef = useRef<HTMLDivElement>(null);
    const prevChatLength = useRef(chat.length);

    // Auto-scroll to bottom when new messages arrive
    useEffect(() => {
        if (chat.length > 0 && chatEndRef.current) {
            setTimeout(() => {
                const el = chatEndRef.current;
                if (!el) return;
                el.scrollIntoView({ behavior: "smooth" });
                if (el.parentElement) {
                    el.parentElement.scrollTop += 40;
                }
            }, 100);
        }
    }, [chat, loading]);

    // Show typing indicator when loading
    useEffect(() => {
        if (loading && chat.length > 0 && chat[chat.length - 1].role === 'user') {
            setShowTyping(true);
        } else {
            setShowTyping(false);
        }
    }, [loading, chat]);

    // Calculate costs for current chat
    const calculateChatCosts = (_models: unknown[], _selectedModel: unknown) => {
        const currentChatCostUSD = chat.reduce((sum, msg) => {
            return sum + (typeof msg.cost === 'number' ? msg.cost : 0);
        }, 0);

        const currentChatCostNaira = chat.reduce((sum, msg) => {
            return sum + (typeof msg.cost === 'number' ? msg.cost * USD_TO_NGN : 0);
        }, 0);

        return { currentChatCostUSD, currentChatCostNaira };
    };

    return {
        // State
        chat,
        setChat,
        loading,
        setLoading,
        error,
        setError,
        streaming,
        setStreaming,
        showTyping,
        setShowTyping,
        totalSpent,
        setTotalSpent,

        // Refs
        chatEndRef,
        prevChatLength,

        // Computed
        calculateChatCosts,
    };
} 