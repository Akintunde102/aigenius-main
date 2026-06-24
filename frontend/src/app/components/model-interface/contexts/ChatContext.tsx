"use client";
/**
 * ChatContext - Centralized chat and session state management
 * 
 * Responsibilities:
 * - Chat messages per session
 * - Session history
 * - Active session tracking
 * - Session switching
 * - Message CRUD operations
 * 
 * @example
 * ```tsx
 * const { messages, sendMessage, currentSessionId } = useChatContext();
 * ```
 */

import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';
import { ChatMessage, ChatSession } from '../shared/types';
import { DRAFT_SESSION_KEY } from '../features/chat/hooks/chatOperations.constants';

// ============================================================================
// Types
// ============================================================================

export interface ChatContextValue {
  /** Map of session ID to messages */
  chatMap: Record<string, ChatMessage[]>;
  
  /** Current active session ID (null = draft) */
  currentSessionId: string | null;
  
  /** Set active session ID */
  setCurrentSessionId: (id: string | null) => void;
  
  /** Messages for current session */
  messages: ChatMessage[];
  
  /** Set messages for current session */
  setMessages: (updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  
  /** Set messages for specific session */
  setMessagesForSession: (sessionId: string, updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])) => void;
  
  /** Chat history (all sessions) */
  chatHistory: ChatSession[];
  
  /** Set chat history */
  setChatHistory: React.Dispatch<React.SetStateAction<ChatSession[]>>;
  
  /** Refresh chat history from storage */
  refreshChatHistory: () => Promise<void>;
  
  /** Update messages for a session in history */
  updateSessionMessages: (sessionId: string, messages: ChatMessage[]) => void;
  
  /** Switch to a different session */
  switchToSession: (sessionId: string) => void;
  
  /** Create new session and switch to it */
  createNewSession: () => string;
  
  /** Check if session is active */
  isSessionActive: (sessionId: string) => boolean;
  
  /** Loading states per session */
  loadingMap: Record<string, boolean>;
  
  /** Set loading for session */
  setLoadingForSession: (sessionId: string, loading: boolean) => void;
  
  /** Streaming states per session */
  streamingMap: Record<string, boolean>;
  
  /** Set streaming for session */
  setStreamingForSession: (sessionId: string, streaming: boolean) => void;
  
  /** Current session loading state */
  isLoading: boolean;
  
  /** Current session streaming state */
  isStreaming: boolean;
}

// ============================================================================
// Context
// ============================================================================

const ChatContext = createContext<ChatContextValue | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface ChatProviderProps {
  children: ReactNode;
  /** Initial chat history (optional) */
  initialHistory?: ChatSession[];
  /** Callback to refresh history from backend */
  onRefreshHistory?: () => Promise<ChatSession[]>;
}

export function ChatProvider({ 
  children, 
  initialHistory = [],
  onRefreshHistory,
}: ChatProviderProps) {
  // Session state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [chatMap, setChatMap] = useState<Record<string, ChatMessage[]>>({});
  const [chatHistory, setChatHistory] = useState<ChatSession[]>(initialHistory);
  
  // UI state per session
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [streamingMap, setStreamingMap] = useState<Record<string, boolean>>({});

  // Current session key (draft if no session selected)
  const activeKey = currentSessionId || DRAFT_SESSION_KEY;
  
  // Current session messages
  const messages = chatMap[activeKey] || [];
  
  // Current session states
  const isLoading = loadingMap[activeKey] || false;
  const isStreaming = streamingMap[activeKey] || false;

  /**
   * Set messages for current session
   */
  const setMessages = useCallback((
    updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])
  ) => {
    setChatMap(prev => ({
      ...prev,
      [activeKey]: typeof updater === 'function' 
        ? updater(prev[activeKey] || [])
        : updater,
    }));
  }, [activeKey]);

  /**
   * Set messages for specific session
   */
  const setMessagesForSession = useCallback((
    sessionId: string,
    updater: ChatMessage[] | ((prev: ChatMessage[]) => ChatMessage[])
  ) => {
    setChatMap(prev => ({
      ...prev,
      [sessionId]: typeof updater === 'function'
        ? updater(prev[sessionId] || [])
        : updater,
    }));
  }, []);

  /**
   * Set loading state for session
   */
  const setLoadingForSession = useCallback((sessionId: string, loading: boolean) => {
    setLoadingMap(prev => ({ ...prev, [sessionId]: loading }));
  }, []);

  /**
   * Set streaming state for session
   */
  const setStreamingForSession = useCallback((sessionId: string, streaming: boolean) => {
    setStreamingMap(prev => ({ ...prev, [sessionId]: streaming }));
  }, []);

  /**
   * Refresh chat history from backend
   */
  const refreshChatHistory = useCallback(async () => {
    if (onRefreshHistory) {
      try {
        const history = await onRefreshHistory();
        setChatHistory(history);
      } catch (error) {
        console.error('Failed to refresh chat history:', error);
      }
    }
  }, [onRefreshHistory]);

  /**
   * Update messages for a session in history
   */
  const updateSessionMessages = useCallback((sessionId: string, newMessages: ChatMessage[]) => {
    setChatHistory(prev =>
      prev.map(session =>
        session.id === sessionId
          ? { ...session, messages: newMessages }
          : session
      )
    );
  }, []);

  /**
   * Switch to a different session
   */
  const switchToSession = useCallback((sessionId: string) => {
    setCurrentSessionId(sessionId);
    
    // Load session messages if not in map
    const session = chatHistory.find(s => s.id === sessionId);
    if (session && !chatMap[sessionId]) {
      setChatMap(prev => ({
        ...prev,
        [sessionId]: session.messages || [],
      }));
    }
  }, [chatHistory, chatMap]);

  /**
   * Create new session and switch to it
   */
  const createNewSession = useCallback((): string => {
    const newSessionId = `session-${Date.now()}`;
    setCurrentSessionId(newSessionId);
    setChatMap(prev => ({
      ...prev,
      [newSessionId]: [],
    }));
    return newSessionId;
  }, []);

  /**
   * Check if session is active
   */
  const isSessionActive = useCallback((sessionId: string): boolean => {
    return currentSessionId === sessionId;
  }, [currentSessionId]);

  const value: ChatContextValue = useMemo(() => ({
    chatMap,
    currentSessionId,
    setCurrentSessionId,
    messages,
    setMessages,
    setMessagesForSession,
    chatHistory,
    setChatHistory,
    refreshChatHistory,
    updateSessionMessages,
    switchToSession,
    createNewSession,
    isSessionActive,
    loadingMap,
    setLoadingForSession,
    streamingMap,
    setStreamingForSession,
    isLoading,
    isStreaming,
  }), [
    chatMap,
    currentSessionId,
    messages,
    setMessages,
    setMessagesForSession,
    chatHistory,
    refreshChatHistory,
    updateSessionMessages,
    switchToSession,
    createNewSession,
    isSessionActive,
    loadingMap,
    setLoadingForSession,
    streamingMap,
    setStreamingForSession,
    isLoading,
    isStreaming,
  ]);

  return (
    <ChatContext.Provider value={value}>
      {children}
    </ChatContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Access chat context
 * @throws Error if used outside ChatProvider
 */
export function useChatContext(): ChatContextValue {
  const context = useContext(ChatContext);
  
  if (context === undefined) {
    throw new Error('useChatContext must be used within a ChatProvider');
  }
  
  return context;
}
