# Context Migration Guide

## 🎯 Overview

This guide helps you migrate from the old `useModelInterface` god hook to the new domain-specific contexts.

## 📦 What Changed?

### Before (❌ Old Way)
```typescript
// ModelInterface.tsx
const {
  models,
  selectedModel,
  setSelectedModel,
  chat,
  setChat,
  wallet,
  setWallet,
  showModelSelectionModal,
  setShowModelSelectionModal,
  // ... 90+ more properties
} = useModelInterface();

// Pass everything as props
<ChatColumn
  models={models}
  selectedModel={selectedModel}
  chat={chat}
  wallet={wallet}
  // ... 30+ more props
/>
```

### After (✅ New Way)
```typescript
// ModelInterface.tsx
<AllProviders>
  <ChatColumn />
</AllProviders>

// ChatColumn.tsx - use only what you need
const { selectedModel } = useModelContext();
const { messages, sendMessage } = useChatContext();
const { balance } = useWalletContext();
const { openModal } = useUIContext();
```

## 🔄 Migration Steps

### Step 1: Wrap with Providers

```typescript
// ModelInterface.tsx
import { AllProviders } from './contexts';

export default function ModelInterface({ routeConversationId }) {
  return (
    <AllProviders>
      {/* Your existing UI */}
    </AllProviders>
  );
}
```

### Step 2: Replace Hook Usage

#### Model Selection
```typescript
// ❌ OLD
const { models, selectedModel, setSelectedModel } = useModelInterface();

// ✅ NEW
const { models, selectedModel, selectModel } = useModelContext();
```

#### Chat Messages
```typescript
// ❌ OLD
const { chat, setChat, currentSessionId } = useModelInterface();

// ✅ NEW
const { messages, setMessages, currentSessionId } = useChatContext();
```

#### Wallet
```typescript
// ❌ OLD
const { wallet, setWallet, refreshWalletFromBackend } = useModelInterface();

// ✅ NEW
const { balance, setBalance, refreshWallet } = useWalletContext();
```

#### UI State
```typescript
// ❌ OLD
const { 
  showModelSelectionModal, 
  setShowModelSelectionModal 
} = useModelInterface();

// ✅ NEW
const { 
  showModelSelectionModal, 
  openModelSelectionModal, 
  closeModelSelectionModal 
} = useUIContext();
```

### Step 3: Remove Prop Drilling

#### Before
```typescript
// Parent
<ChatColumn
  chat={chat}
  setChat={setChat}
  selectedModel={selectedModel}
  models={models}
  wallet={wallet}
  showCosts={showCosts}
  // ... 24 more props
/>

// Child
function ChatColumn({ 
  chat, 
  setChat, 
  selectedModel, 
  models, 
  wallet,
  showCosts,
  // ... 24 more props
}) {
  // Use props
}
```

#### After
```typescript
// Parent
<ChatColumn />

// Child
function ChatColumn() {
  const { messages } = useChatContext();
  const { selectedModel } = useModelContext();
  const { balance } = useWalletContext();
  const { showCosts } = useUIContext();
  
  // Use context values directly
}
```

## 📚 Context Reference

### ModelContext
**Purpose:** Model selection, search, filtering

```typescript
const {
  models,              // All models
  selectedModel,       // Current model
  selectModel,         // Select a model
  searchQuery,         // Search text
  setSearchQuery,      // Update search
  filteredModels,      // Filtered results
  pinnedModelIds,      // Pinned models
  togglePinModel,      // Pin/unpin
  recentModels,        // Recent selections
} = useModelContext();
```

### ChatContext
**Purpose:** Messages, sessions, history

```typescript
const {
  messages,            // Current session messages
  setMessages,         // Update messages
  currentSessionId,    // Active session
  chatHistory,         // All sessions
  switchToSession,     // Change session
  createNewSession,    // New session
  isLoading,           // Loading state
  isStreaming,         // Streaming state
} = useChatContext();
```

### WalletContext
**Purpose:** Balance, payments, gating

```typescript
const {
  balance,             // Current balance
  setBalance,          // Update balance
  refreshWallet,       // Fetch from backend
  isInsufficientFunds, // Check funds
  normalizedBalance,   // Balance or 0
} = useWalletContext();
```

### UIContext
**Purpose:** Modals, sidebars, UI state

```typescript
const {
  // Modals
  showModelSelectionModal,
  openModelSelectionModal,
  closeModelSelectionModal,
  
  // Sidebars
  mainSidebarVisible,
  toggleMainSidebar,
  
  // States
  showScrollToBottom,
  dragActive,
  uploading,
  uploadProgress,
} = useUIContext();
```

## 🔍 Common Patterns

### Pattern 1: Modal Management
```typescript
// ❌ OLD
const [showModal, setShowModal] = useState(false);
<Button onClick={() => setShowModal(true)}>Open</Button>
{showModal && <Modal onClose={() => setShowModal(false)} />}

// ✅ NEW
const { showModal, openModal, closeModal } = useUIContext();
<Button onClick={openModal}>Open</Button>
{showModal && <Modal onClose={closeModal} />}
```

### Pattern 2: Conditional Rendering
```typescript
// ❌ OLD
const { wallet, selectedModel } = useModelInterface();
const hasEnoughFunds = (wallet ?? 0) >= (selectedModel?.cost ?? 0);

// ✅ NEW
const { isInsufficientFunds } = useWalletContext();
const { selectedModel } = useModelContext();
const hasEnoughFunds = !isInsufficientFunds(selectedModel?.cost ?? 0);
```

### Pattern 3: Session Switching
```typescript
// ❌ OLD
const { 
  setCurrentSessionId, 
  setChatHistory, 
  switchToSession 
} = useModelInterface();
switchToSession(session, setCurrentSessionId, setChatHistory);

// ✅ NEW
const { switchToSession } = useChatContext();
switchToSession(session.id);
```

## ⚠️ Breaking Changes

### 1. Property Renames
- `chat` → `messages`
- `setChat` → `setMessages`
- `wallet` → `balance`
- `setWallet` → `setBalance`
- `setSelectedModel` → `selectModel`

### 2. Function Signatures
```typescript
// ❌ OLD
setChat((prev) => [...prev, newMessage]);

// ✅ NEW
setMessages((prev) => [...prev, newMessage]);
```

### 3. Modal State
```typescript
// ❌ OLD
setShowModelSelectionModal(true);
setShowModelSelectionModal(false);

// ✅ NEW
openModelSelectionModal();
closeModelSelectionModal();
```

## 🧪 Testing

### Testing with Contexts
```typescript
import { render } from '@testing-library/react';
import { ModelProvider, ChatProvider } from './contexts';

function renderWithContexts(ui: React.ReactElement) {
  return render(
    <ModelProvider>
      <ChatProvider>
        {ui}
      </ChatProvider>
    </ModelProvider>
  );
}

test('component uses context', () => {
  renderWithContexts(<YourComponent />);
  // assertions
});
```

### Mocking Contexts
```typescript
import { ModelContext } from './contexts/ModelContext';

const mockModelContext = {
  models: [{ id: '1', name: 'Test Model' }],
  selectedModel: null,
  selectModel: jest.fn(),
  // ... other properties
};

test('with mocked context', () => {
  render(
    <ModelContext.Provider value={mockModelContext}>
      <YourComponent />
    </ModelContext.Provider>
  );
});
```

## 📊 Migration Checklist

- [ ] Wrap `ModelInterface` with `AllProviders`
- [ ] Replace `useModelInterface` with specific context hooks
- [ ] Remove prop drilling from components
- [ ] Update property names (chat → messages, etc.)
- [ ] Update function calls (setShowModal → openModal)
- [ ] Test each component after migration
- [ ] Remove unused imports
- [ ] Update TypeScript types
- [ ] Run tests
- [ ] Update documentation

## 🆘 Troubleshooting

### Error: "useModelContext must be used within a ModelProvider"
**Solution:** Ensure component is wrapped with providers
```typescript
<AllProviders>
  <YourComponent />
</AllProviders>
```

### Error: Property 'chat' does not exist
**Solution:** Use `messages` instead of `chat`
```typescript
// ❌ const { chat } = useChatContext();
// ✅ const { messages } = useChatContext();
```

### Performance Issues
**Solution:** Use selective context consumption
```typescript
// ❌ BAD - Re-renders on any context change
const allContext = useModelContext();

// ✅ GOOD - Only re-renders when selectedModel changes
const { selectedModel } = useModelContext();
```

## 📞 Need Help?

- Check the [REFACTORING_PLAN.md](./REFACTORING_PLAN.md)
- Review context implementations in `contexts/`
- Look at example usage in updated components
- Ask the team in #frontend-architecture

---

**Last Updated:** 2026-05-10
**Status:** 🟢 Ready for Migration
