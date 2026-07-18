"use client";
/**
 * ChatOperationsContext - Manages sending, streaming, and input state
 */

import React, { createContext, useContext, ReactNode, useState, useCallback, useRef } from 'react';
import { useChatContext } from './ChatContext';
import { useModelContext } from './ModelContext';
import { useChatOperationsRefined } from '../features/chat/hooks/useChatOperationsRefined';
import { DRAFT_SESSION_KEY } from '../features/chat/hooks/chatOperations.constants';
import { usePersonalityContext } from './PersonalityContext';
import { PendingOrphanReply } from '../shared/types';
import { ChatMessage } from '../shared/types';

export interface ChatOperationsContextValue {
  input: string;
  setInput: React.Dispatch<React.SetStateAction<string>>;
  assistantResponse: string;
  optimizationMessage: string;
  handleSend: (content?: string, enableStreaming?: boolean, preCreatedMessage?: ChatMessage, chatSnapshot?: ChatMessage[]) => Promise<boolean>;
  handleStop: () => void;
  error: string;
  setError: React.Dispatch<React.SetStateAction<string>>;
  pendingOrphanReply: PendingOrphanReply | null;
  setPendingOrphanReply: React.Dispatch<React.SetStateAction<PendingOrphanReply | null>>;
  clearPendingOrphanReply: () => void;
}

const ChatOperationsContext = createContext<ChatOperationsContextValue | undefined>(undefined);

export function ChatOperationsProvider({ children }: { children: ReactNode }) {
  const {
    chatMap,
    setMessagesForSession,
    isStreaming,
    setStreamingForSession,
    setLoadingForSession,
    currentSessionId,
    setCurrentSessionId,
    setChatHistory,
    updateSessionMessages,
    refreshChatHistory
  } = useChatContext();

  const { selectedModel } = useModelContext();
  const { selectedPersonalityName, selectedPersonalityIconUrl } = usePersonalityContext();

  const [error, setError] = useState("");
  const [pendingOrphanReply, setPendingOrphanReply] = useState<PendingOrphanReply | null>(null);

  // We mock a chatEndRef for operations that need it
  const chatEndRef = useRef<HTMLDivElement | null>(null);

  // In the real migration, we hook this up to useChatOperationsRefined
  // We need to pass the active chat array
  const activeKey = currentSessionId ?? DRAFT_SESSION_KEY;
  const chat = chatMap[activeKey] || [];

  const setChat = useCallback((updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => {
    setMessagesForSession(activeKey, updater);
  }, [activeKey, setMessagesForSession]);

  const {
    input,
    setInput,
    assistantResponse,
    optimizationMessage,
    handleSend,
    handleStop,
  } = useChatOperationsRefined({
    selectedModel,
    chat,
    setChat,
    setChatForSession: setMessagesForSession,
    streaming: isStreaming,
    setStreamingForSession,
    setLoadingForSession,
    setError,
    streamingEnabled: true, // We can pull this from UIContext later if needed
    chatEndRef,
    refreshChatHistory,
    currentSessionId,
    setCurrentSessionId,
    setChatHistory,
    updateSessionMessages,
    selectedPersonalityName,
    selectedPersonalityIconUrl,
    pendingOrphanReply,
    clearPendingOrphanReply: () => setPendingOrphanReply(null),
  });

  const value = {
    input,
    setInput,
    assistantResponse,
    optimizationMessage,
    handleSend,
    handleStop,
    error,
    setError,
    pendingOrphanReply,
    setPendingOrphanReply,
    clearPendingOrphanReply: () => setPendingOrphanReply(null),
  };

  return (
    <ChatOperationsContext.Provider value={value}>
      {children}
    </ChatOperationsContext.Provider>
  );
}

export function useChatOperationsContext() {
  const context = useContext(ChatOperationsContext);
  if (context === undefined) {
    throw new Error('useChatOperationsContext must be used within a ChatOperationsProvider');
  }
  return context;
}
