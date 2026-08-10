/**
 * Domain Contexts - Centralized state management
 * 
 * This module exports all domain-specific contexts for the model interface.
 * Each context manages a specific domain of the application state.
 * 
 * @example
 * ```tsx
 * import { ModelProvider, ChatProvider, WalletProvider } from './contexts';
 * 
 * function App() {
 *   return (
 *     <ModelProvider>
 *       <ChatProvider>
 *         <WalletProvider>
 *           <YourApp />
 *         </WalletProvider>
 *       </ChatProvider>
 *     </ModelProvider>
 *   );
 * }
 * ```
 */

// Imports for AllProviders
import { ModelProvider } from './ModelContext';
import { ChatProvider } from './ChatContext';
import { WalletProvider } from './WalletContext';
import { UIProvider } from './UIContext';
import { PersonalityProvider } from './PersonalityContext';
import { SavedChatProvider } from './SavedChatContext';

// Contexts
export { ModelProvider, useModelContext } from './ModelContext';
export type { ModelContextValue, Model } from './ModelContext';

export { ChatProvider, useChatContext } from './ChatContext';
export type { ChatContextValue } from './ChatContext';

export { WalletProvider, useWalletContext, normalizeWalletForGating } from './WalletContext';
export type { WalletContextValue } from './WalletContext';

export { UIProvider, useUIContext } from './UIContext';
export type { UIContextValue } from './UIContext';

export { ChatOperationsProvider, useChatOperationsContext } from './ChatOperationsContext';
export type { ChatOperationsContextValue } from './ChatOperationsContext';

export { AudioProvider, useAudioContext } from './AudioContext';
export type { AudioContextValue } from './AudioContext';

export { PersonalityProvider, usePersonalityContext } from './PersonalityContext';
export type { PersonalityContextValue } from './PersonalityContext';

export { SavedChatProvider, useSavedChatContext } from './SavedChatContext';
export type { SavedChatContextValue } from './SavedChatContext';

/**
 * @deprecated Production chat state lives in {@link useModelInterface} — do not wrap ModelInterface.
 * Kept for isolated context unit tests and Storybook experiments.
 */
export function AllProviders({ children }: { children: React.ReactNode }) {
  return (
    <UIProvider>
      <WalletProvider>
        <ModelProvider>
          <ChatProvider>
            <PersonalityProvider>
              <SavedChatProvider>{children}</SavedChatProvider>
            </PersonalityProvider>
          </ChatProvider>
        </ModelProvider>
      </WalletProvider>
    </UIProvider>
  );
}
