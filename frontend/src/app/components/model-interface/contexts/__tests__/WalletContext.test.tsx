/**
 * @jest-environment jsdom
 */
import React from 'react';
import { renderHook, act, waitFor } from '@testing-library/react';
import { WalletProvider, useWalletContext } from '../WalletContext';
import * as getUserDetailsModule from '@/lib/calls/get-logged-user-details';

// Mock the getUserDetails function
jest.mock('@/lib/calls/get-logged-user-details');

describe('WalletContext', () => {
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <WalletProvider>{children}</WalletProvider>
  );

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Initial State', () => {
    it('should have null balance initially', () => {
      const { result } = renderHook(() => useWalletContext(), { wrapper });
      
      expect(result.current.balance).toBeNull();
      expect(result.current.normalizedBalance).toBe(0);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should accept initial balance', () => {
      const customWrapper = ({ children }: { children: React.ReactNode }) => (
        <WalletProvider initialBalance={100}>{children}</WalletProvider>
      );
      
      const { result } = renderHook(() => useWalletContext(), { wrapper: customWrapper });
      
      expect(result.current.balance).toBe(100);
      expect(result.current.normalizedBalance).toBe(100);
    });
  });

  describe('setBalance', () => {
    it('should update balance', () => {
      const { result } = renderHook(() => useWalletContext(), { wrapper });
      
      act(() => {
        result.current.setBalance(50);
      });
      
      expect(result.current.balance).toBe(50);
      expect(result.current.normalizedBalance).toBe(50);
    });

    it('should handle null balance', () => {
      const { result } = renderHook(() => useWalletContext(), { wrapper });
      
      act(() => {
        result.current.setBalance(100);
      });
      
      expect(result.current.balance).toBe(100);
      
      act(() => {
        result.current.setBalance(null);
      });
      
      expect(result.current.balance).toBeNull();
      expect(result.current.normalizedBalance).toBe(0);
    });
  });

  describe('refreshWallet', () => {
    it('should fetch and update balance from backend', async () => {
      const mockGetUserDetails = jest.spyOn(getUserDetailsModule, 'getUserDetails');
      mockGetUserDetails.mockResolvedValue({
        config: { wallet: 75 },
      } as any);
      
      const { result } = renderHook(() => useWalletContext(), { wrapper });
      
      let newBalance: number | null = null;
      
      await act(async () => {
        newBalance = await result.current.refreshWallet();
      });
      
      expect(mockGetUserDetails).toHaveBeenCalledWith(true);
      expect(newBalance).toBe(75);
      expect(result.current.balance).toBe(75);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should handle missing wallet in user details', async () => {
      const mockGetUserDetails = jest.spyOn(getUserDetailsModule, 'getUserDetails');
      mockGetUserDetails.mockResolvedValue({
        config: {},
      } as any);
      
      const { result } = renderHook(() => useWalletContext(), { wrapper });
      
      let newBalance: number | null = null;
      
      await act(async () => {
        newBalance = await result.current.refreshWallet();
      });
      
      expect(newBalance).toBeNull();
      expect(result.current.balance).toBeNull();
    });

    it('should handle errors gracefully', async () => {
      const mockGetUserDetails = jest.spyOn(getUserDetailsModule, 'getUserDetails');
      const error = new Error('Network error');
      mockGetUserDetails.mockRejectedValue(error);
      
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      const { result } = renderHook(() => useWalletContext(), { wrapper });
      
      let newBalance: number | null = null;
      
      await act(async () => {
        newBalance = await result.current.refreshWallet();
      });
      
      expect(newBalance).toBeNull();
      expect(result.current.balance).toBeNull();
      expect(result.current.error).toBe('Network error');
      expect(result.current.isLoading).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith('Failed to refresh wallet:', error);
      
      consoleSpy.mockRestore();
    });

    it('should set loading state during refresh', async () => {
      const mockGetUserDetails = jest.spyOn(getUserDetailsModule, 'getUserDetails');
      mockGetUserDetails.mockImplementation(() => 
        new Promise(resolve => setTimeout(() => resolve({ config: { wallet: 100 } } as any), 100))
      );
      
      const { result } = renderHook(() => useWalletContext(), { wrapper });
      
      act(() => {
        result.current.refreshWallet();
      });
      
      // Should be loading immediately
      expect(result.current.isLoading).toBe(true);
      
      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });
      
      expect(result.current.balance).toBe(100);
    });
  });

  describe('isInsufficientFunds', () => {
    it('should return true when balance is less than required', () => {
      const { result } = renderHook(() => useWalletContext(), { wrapper });
      
      act(() => {
        result.current.setBalance(10);
      });
      
      expect(result.current.isInsufficientFunds(20)).toBe(true);
    });

    it('should return false when balance is sufficient', () => {
      const { result } = renderHook(() => useWalletContext(), { wrapper });
      
      act(() => {
        result.current.setBalance(50);
      });
      
      expect(result.current.isInsufficientFunds(20)).toBe(false);
    });

    it('should treat null balance as 0', () => {
      const { result } = renderHook(() => useWalletContext(), { wrapper });
      
      expect(result.current.balance).toBeNull();
      expect(result.current.isInsufficientFunds(10)).toBe(true);
    });

    it('should return false when balance equals required', () => {
      const { result } = renderHook(() => useWalletContext(), { wrapper });
      
      act(() => {
        result.current.setBalance(20);
      });
      
      expect(result.current.isInsufficientFunds(20)).toBe(false);
    });
  });

  describe('Error Handling', () => {
    it('should throw error when used outside provider', () => {
      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation();
      
      expect(() => {
        renderHook(() => useWalletContext());
      }).toThrow('useWalletContext must be used within a WalletProvider');
      
      consoleSpy.mockRestore();
    });
  });
});
