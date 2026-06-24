import { useState, useEffect } from 'react';
import { ChatMessage, ChatSession } from '@/app/components/model-interface/shared/types';
import {
    getSavedChatItems,
    removeSavedChatItemById,
    getSavedFullChatSessions,
    getChatHistory,
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

    // Load chat history and saved chats on mount - now uses IndexedDB first
    useEffect(() => {
        const loadData = async () => {
            try {
                // These functions now load from IndexedDB first, then sync with backend
                const [savedChatsData, savedFullChatsData, chatHistoryData, pinnedChatsData] = await Promise.all([
                    getSavedChatItems(),
                    getSavedFullChatSessions(),
                    getChatHistory(),
                    getPinnedChats()
                ]);
                setSavedChats(savedChatsData);
                setSavedFullChats(savedFullChatsData);
                setChatHistory(chatHistoryData);
                setPinnedChats(pinnedChatsData);
            } catch (error) {
                console.error('Failed to load chat data:', error);
                // Don't block UI on error - just log it
            }
        };
        loadData();
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
