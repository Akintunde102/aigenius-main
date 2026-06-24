"use client";
/**
 * SavedChatContext - Manages saved chats and operations
 */

import React, { createContext, useContext, ReactNode, useState, useEffect, useCallback } from 'react';
import { ChatMessage } from '../shared/types';
import { getSavedChatItems, saveChatItem, removeSavedChatItemById } from '@/lib/utils/modelChatConversationUtils';
import { useChatContext } from './ChatContext';
import { DRAFT_SESSION_KEY } from '../features/chat/hooks/chatOperations.constants';

export interface SavedChatContextValue {
  savedChats: ChatMessage[];
  setSavedChats: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  savedFullChats: ChatMessage[];
  setSavedFullChats: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
  handleSave: (msg: ChatMessage) => Promise<void>;
  handleInsertSaved: (msg: ChatMessage) => Promise<void>;
  handleRemoveSaved: (mongoId: string) => Promise<void>;
}

const SavedChatContext = createContext<SavedChatContextValue | undefined>(undefined);

export function SavedChatProvider({ children }: { children: ReactNode }) {
  const [savedChats, setSavedChats] = useState<ChatMessage[]>([]);
  const [savedFullChats, setSavedFullChats] = useState<ChatMessage[]>([]);

  const { setMessagesForSession, currentSessionId } = useChatContext();
  const activeKey = currentSessionId ?? DRAFT_SESSION_KEY;

  useEffect(() => {
    void (async () => {
      try {
        const sc = await getSavedChatItems();
        setSavedChats(sc);
      } catch (err) {
        console.error("Failed to load saved chats:", err);
      }
    })();
  }, []);

  const handleSave = useCallback(async (msg: ChatMessage) => {
    await saveChatItem(msg);
    const updatedSavedChats = await getSavedChatItems();
    setSavedChats(updatedSavedChats);
  }, []);

  const handleRemoveSaved = useCallback(async (mongoId: string) => {
    await removeSavedChatItemById(mongoId);
    const updatedSavedChats = await getSavedChatItems();
    setSavedChats(updatedSavedChats);
  }, []);

  const handleInsertSaved = useCallback(async (msg: ChatMessage) => {
    setMessagesForSession(activeKey, (prev) => [...prev, msg]);
  }, [activeKey, setMessagesForSession]);

  const value = {
    savedChats,
    setSavedChats,
    savedFullChats,
    setSavedFullChats,
    handleSave,
    handleInsertSaved,
    handleRemoveSaved,
  };

  return (
    <SavedChatContext.Provider value={value}>
      {children}
    </SavedChatContext.Provider>
  );
}

export function useSavedChatContext() {
  const context = useContext(SavedChatContext);
  if (context === undefined) {
    throw new Error('useSavedChatContext must be used within a SavedChatProvider');
  }
  return context;
}
