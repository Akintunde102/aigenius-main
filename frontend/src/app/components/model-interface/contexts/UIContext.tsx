"use client";
/**
 * UIContext - Centralized UI state management
 * 
 * Responsibilities:
 * - Modal visibility states
 * - Sidebar states
 * - Loading indicators
 * - Toast/notification states
 * - Scroll states
 * - Drag & drop states
 * 
 * @example
 * ```tsx
 * const { showModal, openModal, closeModal } = useUIContext();
 * ```
 */

import React, { createContext, useContext, useState, useCallback, ReactNode, useMemo } from 'react';

// ============================================================================
// Types
// ============================================================================

export interface UIContextValue {
  // Modal states
  showModelSelectionModal: boolean;
  openModelSelectionModal: () => void;
  closeModelSelectionModal: () => void;
  
  showModelDetailsModal: boolean;
  openModelDetailsModal: () => void;
  closeModelDetailsModal: () => void;
  
  showPersonalityModal: boolean;
  openPersonalityModal: () => void;
  closePersonalityModal: () => void;
  
  showWalletModal: boolean;
  openWalletModal: () => void;
  closeWalletModal: () => void;
  
  showSavedChatsModal: boolean;
  openSavedChatsModal: () => void;
  closeSavedChatsModal: () => void;
  
  // Sidebar states
  mainSidebarVisible: boolean;
  toggleMainSidebar: () => void;
  setMainSidebarVisible: (visible: boolean) => void;
  
  mobileSidebarOpen: boolean;
  toggleMobileSidebar: () => void;
  setMobileSidebarOpen: (open: boolean) => void;
  
  // UI states
  showScrollToBottom: boolean;
  setShowScrollToBottom: (show: boolean) => void;
  
  showTyping: boolean;
  setShowTyping: (show: boolean) => void;
  
  dragActive: boolean;
  setDragActive: (active: boolean) => void;
  
  // Upload states
  uploading: boolean;
  setUploading: (uploading: boolean) => void;
  
  uploadProgress: number;
  setUploadProgress: (progress: number) => void;
  
  // Preview states
  imagePreview: string | null;
  setImagePreview: (preview: string | null) => void;
  
  // Search states
  historySearch: string;
  setHistorySearch: (search: string) => void;
  
  // Display preferences
  showCosts: boolean;
  setShowCosts: (show: boolean) => void;
  
  showNaira: boolean;
  setShowNaira: (show: boolean) => void;
  
  // Optimization message
  optimizationMessage: string | null;
  setOptimizationMessage: (message: string | null) => void;
}

// ============================================================================
// Context
// ============================================================================

const UIContext = createContext<UIContextValue | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface UIProviderProps {
  children: ReactNode;
}

export function UIProvider({ children }: UIProviderProps) {
  // Modal states
  const [showModelSelectionModal, setShowModelSelectionModal] = useState(false);
  const [showModelDetailsModal, setShowModelDetailsModal] = useState(false);
  const [showPersonalityModal, setShowPersonalityModal] = useState(false);
  const [showWalletModal, setShowWalletModal] = useState(false);
  const [showSavedChatsModal, setShowSavedChatsModal] = useState(false);
  
  // Sidebar states
  const [mainSidebarVisible, setMainSidebarVisible] = useState(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  
  // UI states
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  
  // Upload states
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Preview states
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  
  // Search states
  const [historySearch, setHistorySearch] = useState('');
  
  // Display preferences
  const [showCosts, setShowCosts] = useState(true);
  const [showNaira, setShowNaira] = useState(false);
  
  // Optimization message
  const [optimizationMessage, setOptimizationMessage] = useState<string | null>(null);

  // Modal handlers
  const openModelSelectionModal = useCallback(() => setShowModelSelectionModal(true), []);
  const closeModelSelectionModal = useCallback(() => setShowModelSelectionModal(false), []);
  
  const openModelDetailsModal = useCallback(() => setShowModelDetailsModal(true), []);
  const closeModelDetailsModal = useCallback(() => setShowModelDetailsModal(false), []);
  
  const openPersonalityModal = useCallback(() => setShowPersonalityModal(true), []);
  const closePersonalityModal = useCallback(() => setShowPersonalityModal(false), []);
  
  const openWalletModal = useCallback(() => setShowWalletModal(true), []);
  const closeWalletModal = useCallback(() => setShowWalletModal(false), []);
  
  const openSavedChatsModal = useCallback(() => setShowSavedChatsModal(true), []);
  const closeSavedChatsModal = useCallback(() => setShowSavedChatsModal(false), []);
  
  // Sidebar handlers
  const toggleMainSidebar = useCallback(() => {
    setMainSidebarVisible(prev => !prev);
  }, []);
  
  const toggleMobileSidebar = useCallback(() => {
    setMobileSidebarOpen(prev => !prev);
  }, []);

  const value: UIContextValue = useMemo(() => ({
    // Modals
    showModelSelectionModal,
    openModelSelectionModal,
    closeModelSelectionModal,
    showModelDetailsModal,
    openModelDetailsModal,
    closeModelDetailsModal,
    showPersonalityModal,
    openPersonalityModal,
    closePersonalityModal,
    showWalletModal,
    openWalletModal,
    closeWalletModal,
    showSavedChatsModal,
    openSavedChatsModal,
    closeSavedChatsModal,
    
    // Sidebars
    mainSidebarVisible,
    toggleMainSidebar,
    setMainSidebarVisible,
    mobileSidebarOpen,
    toggleMobileSidebar,
    setMobileSidebarOpen,
    
    // UI states
    showScrollToBottom,
    setShowScrollToBottom,
    showTyping,
    setShowTyping,
    dragActive,
    setDragActive,
    
    // Upload
    uploading,
    setUploading,
    uploadProgress,
    setUploadProgress,
    
    // Preview
    imagePreview,
    setImagePreview,
    
    // Search
    historySearch,
    setHistorySearch,
    
    // Display
    showCosts,
    setShowCosts,
    showNaira,
    setShowNaira,
    
    // Optimization
    optimizationMessage,
    setOptimizationMessage,
  }), [
    showModelSelectionModal,
    openModelSelectionModal,
    closeModelSelectionModal,
    showModelDetailsModal,
    openModelDetailsModal,
    closeModelDetailsModal,
    showPersonalityModal,
    openPersonalityModal,
    closePersonalityModal,
    showWalletModal,
    openWalletModal,
    closeWalletModal,
    showSavedChatsModal,
    openSavedChatsModal,
    closeSavedChatsModal,
    mainSidebarVisible,
    toggleMainSidebar,
    mobileSidebarOpen,
    toggleMobileSidebar,
    showScrollToBottom,
    showTyping,
    dragActive,
    uploading,
    uploadProgress,
    imagePreview,
    historySearch,
    showCosts,
    showNaira,
    optimizationMessage,
  ]);

  return (
    <UIContext.Provider value={value}>
      {children}
    </UIContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Access UI context
 * @throws Error if used outside UIProvider
 */
export function useUIContext(): UIContextValue {
  const context = useContext(UIContext);
  
  if (context === undefined) {
    throw new Error('useUIContext must be used within a UIProvider');
  }
  
  return context;
}
