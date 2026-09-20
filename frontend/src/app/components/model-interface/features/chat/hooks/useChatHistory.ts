import { useState, useEffect } from 'react';
import { ChatMessage, ChatSession } from '@/app/components/model-interface/shared/types';
import {
    getSavedChatItems,
    removeSavedChatItemById,
    getSavedFullChatSessions,
    getChatHistory,
    getAllChatResources,
    getPinnedChats,
    pinChatSession,
    unpinChatSession,
    saveChatItem
} from '@/lib/utils/modelChatConversationUtils';
import { savePinnedChats } from '@/lib/utils/modelInterfaceUtils';

export function useChatHistory() {
    const [chatHistory, setChatHistory] = useState<ChatSession[]>([]);
    const [savedChats, setSavedChats] = useState<ChatMessage[]>([]);
    const [savedFullChats, setSavedFullChats] = useState<ChatSession[]>([]);
    const [pinnedChats, setPinnedChats] = useState<ChatSession[]>([]);
    const [showSaved, setShowSaved] = useState(false);

    const [historySearch, setHistorySearch] = useState("");
    const [deletingIdx, setDeletingIdx] = useState<number | null>(null);
    const [pendingDeleteIdx, setPendingDeleteIdx] = useState<number | null>(null);

    // Load initial per-project chat preview (top 5 per project) and background prefetch older chats
    useEffect(() => {
        let isMounted = true;
        const loadData = async () => {
            try {
                const [savedChatsData, savedFullChatsData, initialResources, pinnedChatsData] = await Promise.all([
                    getSavedChatItems(),
                    getSavedFullChatSessions(),
                    getAllChatResources({ perProjectLimit: 5 }),
                    getPinnedChats()
                ]);
                if (!isMounted) return;

                setSavedChats(savedChatsData);
                setSavedFullChats(savedFullChatsData);
                setChatHistory(initialResources.chatHistory || []);
                setPinnedChats(pinnedChatsData);

                // Background prefetch remaining history silently without blocking UI
                if (initialResources.hasNextPage || initialResources.nextCursor) {
                    const prefetchOlderPages = async () => {
                        try {
                            const fullResources = await getAllChatResources({ limit: 50, cursor: initialResources.nextCursor });
                            if (!isMounted) return;
                            if (fullResources.chatHistory?.length) {
                                setChatHistory(prev => {
                                    const existingIds = new Set(prev.map(c => c.id));
                                    const newItems = fullResources.chatHistory.filter(c => Boolean(c.id) && !existingIds.has(c.id));
                                    return [...prev, ...newItems];
                                });
                            }
                        } catch (err) {
                            console.warn('Background chat history prefetch skipped or completed:', err);
                        }
                    };

                    if (typeof window !== 'undefined' && 'requestIdleCallback' in window) {
                        window.requestIdleCallback(() => { void prefetchOlderPages(); });
                    } else {
                        setTimeout(() => { void prefetchOlderPages(); }, 1200);
                    }
                }
            } catch (error) {
                console.error('Failed to load chat data:', error);
            }
        };
        loadData();
        return () => { isMounted = false; };
    }, []);

    // Save pinned chats when changed
    useEffect(() => {
        savePinnedChats(pinnedChats);
    }, [pinnedChats]);

    // Save individual chat message
    const handleSave = async (msg: ChatMessage) => {
        try {
            await saveChatItem(msg);
            setSavedChats(prev => [...prev, msg]);
        } catch (error) {
            console.error('Failed to save chat item:', error);
        }
    };

    // Remove saved chat message
    const handleRemoveSaved = async (mongoId: string) => {
        try {
            await removeSavedChatItemById(mongoId);
            setSavedChats(prev => prev.filter(m => m.id !== mongoId));
        } catch (error) {
            console.error('Failed to remove saved chat:', error);
        }
    };

    // Pin/unpin chat session
    const handlePinChat = async (session: ChatSession) => {
        try {
            const updatedPinnedChats = await pinChatSession(session, pinnedChats);
            setPinnedChats(updatedPinnedChats);
        } catch (error) {
            console.error('Failed to pin chat:', error);
        }
    };

    const handleUnpinChat = async (session: ChatSession) => {
        try {
            await unpinChatSession(session);
            const updatedPinnedChats = await getPinnedChats();
            setPinnedChats(updatedPinnedChats);
        } catch (error) {
            console.error('Failed to unpin chat:', error);
        }
    };

    return {
        // State
        chatHistory,
        setChatHistory,
        savedChats,
        setSavedChats,
        savedFullChats,
        setSavedFullChats,
        pinnedChats,
        setPinnedChats,
        showSaved,
        setShowSaved,

        historySearch,
        setHistorySearch,
        deletingIdx,
        setDeletingIdx,
        pendingDeleteIdx,
        setPendingDeleteIdx,

        // Methods
        handleSave,
        handleRemoveSaved,
        handlePinChat,
        handleUnpinChat,
    };
} 
