"use client";
/**
 * WalletContext - Centralized wallet state management
 * 
 * Responsibilities:
 * - Wallet balance state
 * - Refresh wallet from backend
 * - Payment success handling
 * - Insufficient funds detection
 * 
 * @example
 * ```tsx
 * // In a component
 * const { balance, refreshWallet, isInsufficientFunds } = useWalletContext();
 * ```
 */

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { getUserDetails } from '@/lib/calls/get-logged-user-details';

// ============================================================================
// Types
// ============================================================================

export interface WalletContextValue {
  /** Current wallet balance (null if not loaded) */
  balance: number | null;
  
  /** Set wallet balance directly */
  setBalance: (balance: number | null) => void;
  
  /** Refresh wallet balance from backend */
  refreshWallet: () => Promise<number | null>;
  
  /** Check if user has insufficient funds for a model */
  isInsufficientFunds: (requiredBalance: number) => boolean;
  
  /** Normalized balance for gating (treats null as 0) */
  normalizedBalance: number;
  
  /** Loading state for wallet operations */
  isLoading: boolean;
  
  /** Error state */
  error: string | null;
}

// ============================================================================
// Context
// ============================================================================

const WalletContext = createContext<WalletContextValue | undefined>(undefined);

// ============================================================================
// Provider
// ============================================================================

interface WalletProviderProps {
  children: ReactNode;
  /** Initial wallet balance (optional) */
  initialBalance?: number | null;
}

export function WalletProvider({ children, initialBalance = null }: WalletProviderProps) {
  const [balance, setBalance] = useState<number | null>(initialBalance);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  /**
   * Refresh wallet balance from backend
   * @returns Updated balance or null on error
   */
  const refreshWallet = useCallback(async (): Promise<number | null> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const userDetails = await getUserDetails(true);
      const newBalance = userDetails?.config?.wallet ?? null;
      setBalance(newBalance);
      return newBalance;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to refresh wallet';
      setError(errorMessage);
      console.error('Failed to refresh wallet:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  /**
   * Check if user has insufficient funds
   * @param requiredBalance - Minimum balance required
   * @returns true if insufficient funds
   */
  const isInsufficientFunds = useCallback((requiredBalance: number): boolean => {
    const normalized = balance ?? 0;
    return normalized < requiredBalance;
  }, [balance]);

  /**
   * Normalized balance (treats null as 0)
   */
  const normalizedBalance = balance ?? 0;

  const value: WalletContextValue = {
    balance,
    setBalance,
    refreshWallet,
    isInsufficientFunds,
    normalizedBalance,
    isLoading,
    error,
  };

  return (
    <WalletContext.Provider value={value}>
      {children}
    </WalletContext.Provider>
  );
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Access wallet context
 * @throws Error if used outside WalletProvider
 */
export function useWalletContext(): WalletContextValue {
  const context = useContext(WalletContext);
  
  if (context === undefined) {
    throw new Error('useWalletContext must be used within a WalletProvider');
  }
  
  return context;
}

// ============================================================================
// Utilities
// ============================================================================

/**
 * Normalize wallet balance for gating logic
 * Extracted for backward compatibility with existing code
 */
export function normalizeWalletForGating(wallet: number | null | undefined): number {
  return wallet ?? 0;
}
