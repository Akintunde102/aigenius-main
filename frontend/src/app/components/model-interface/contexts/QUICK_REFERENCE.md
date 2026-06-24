# Context Quick Reference Card

## 🚀 Quick Start (30 seconds)

```typescript
// 1. Wrap your app
import { AllProviders } from './contexts';

<AllProviders>
  <YourApp />
</AllProviders>

// 2. Use in components
import { useModelContext, useChatContext, useWalletContext, useUIContext } from './contexts';

function MyComponent() {
  const { selectedModel } = useModelContext();
  const { messages } = useChatContext();
  const { balance } = useWalletContext();
  const { openModal } = useUIContext();
  
  // Use them!
}
```

---

## 📚 Context Cheat Sheet

### ModelContext - Models, Search, Filters

```typescript
const {
  // Data
  models,              // Model[]
  selectedModel,       // Model | null
  filteredModels,      // Model[] (computed)
  
  // Actions
  selectModel,         // (model: Model) => void
  setSearchQuery,      // (query: string) => void
  togglePinModel,      // (id: string) => void
  
  // State
  searchQuery,         // string
  pinnedModelIds,      // string[]
  recentModels,        // string[]
  isLoading,           // boolean
} = useModelContext();
```

**Common Use Cases:**
```typescript
// Select a model
selectModel(model);

// Search models
setSearchQuery('gpt-4');

// Pin/unpin
togglePinModel(model.id);

// Check if pinned
isModelPinned(model.id);
```

---

### ChatContext - Messages, Sessions, History

```typescript
const {
  // Current session
  messages,            // ChatMessage[]
  currentSessionId,    // string | null
  isLoading,           // boolean
  isStreaming,         // boolean
  
  // Actions
  setMessages,         // (updater) => void
  switchToSession,     // (id: string) => void
  createNewSession,    // () => string
  
  // History
  chatHistory,         // ChatSession[]
  setChatHistory,      // (updater) => void
  refreshChatHistory,  // () => Promise<void>
} = useChatContext();
```

**Common Use Cases:**
```typescript
// Add message
setMessages(prev => [...prev, newMessage]);

// Switch session
switchToSession(sessionId);

// Create new session
const newId = createNewSession();

// Check if active
isSessionActive(sessionId);
```

---

### WalletContext - Balance, Payments

```typescript
const {
  // Data
  balance,             // number | null
  normalizedBalance,   // number (balance or 0)
  
  // Actions
  setBalance,          // (balance: number | null) => void
  refreshWallet,       // () => Promise<number | null>
  isInsufficientFunds, // (required: number) => boolean
  
  // State
  isLoading,           // boolean
  error,               // string | null
} = useWalletContext();
```

**Common Use Cases:**
```typescript
// Check funds
if (isInsufficientFunds(modelCost)) {
  openWalletModal();
}

// Refresh balance
const newBalance = await refreshWallet();

// Update balance
setBalance(100);

// Display balance
<p>Balance: ${normalizedBalance.toFixed(2)}</p>
```

---

### UIContext - Modals, Sidebars, UI State

```typescript
const {
  // Modals
  showModelSelectionModal,
  openModelSelectionModal,
  closeModelSelectionModal,
  
  showWalletModal,
  openWalletModal,
  closeWalletModal,
  
  // Sidebars
  mainSidebarVisible,
  toggleMainSidebar,
  
  // Upload
  uploading,           // boolean
  uploadProgress,      // number
  setUploading,        // (uploading: boolean) => void
  setUploadProgress,   // (progress: number) => void
  
  // Other
  dragActive,          // boolean
  showScrollToBottom,  // boolean
} = useUIContext();
```

**Common Use Cases:**
```typescript
// Open modal
<button onClick={openModelSelectionModal}>Select Model</button>

// Show modal
{showModelSelectionModal && (
  <Modal onClose={closeModelSelectionModal}>
    {/* content */}
  </Modal>
)}

// Toggle sidebar
<button onClick={toggleMainSidebar}>Toggle</button>

// Upload progress
{uploading && <Progress value={uploadProgress} />}
```

---

## 🎯 Common Patterns

### Pattern 1: Conditional Rendering
```typescript
function SendButton() {
  const { selectedModel } = useModelContext();
  const { balance } = useWalletContext();
  const { messages } = useChatContext();
  
  const canSend = selectedModel && balance > 0 && messages.length > 0;
  
  return <button disabled={!canSend}>Send</button>;
}
```

### Pattern 2: Modal Management
```typescript
function ModelPicker() {
  const { openModelSelectionModal } = useUIContext();
  
  return <button onClick={openModelSelectionModal}>Pick Model</button>;
}

function ModelSelectionModal() {
  const { showModelSelectionModal, closeModelSelectionModal } = useUIContext();
  const { models, selectModel } = useModelContext();
  
  if (!showModelSelectionModal) return null;
  
  return (
    <Modal onClose={closeModelSelectionModal}>
      {models.map(model => (
        <button onClick={() => {
          selectModel(model);
          closeModelSelectionModal();
        }}>
          {model.name}
        </button>
      ))}
    </Modal>
  );
}
```

### Pattern 3: Async Operations
```typescript
function WalletRefresh() {
  const { refreshWallet, isLoading } = useWalletContext();
  
  const handleRefresh = async () => {
    const newBalance = await refreshWallet();
    if (newBalance !== null) {
      toast.success(`Balance updated: $${newBalance}`);
    }
  };
  
  return (
    <button onClick={handleRefresh} disabled={isLoading}>
      {isLoading ? 'Refreshing...' : 'Refresh'}
    </button>
  );
}
```

### Pattern 4: Functional Updates
```typescript
function ChatInput() {
  const { setMessages } = useChatContext();
  
  const handleSend = (text: string) => {
    // ✅ GOOD - Functional update
    setMessages(prev => [...prev, {
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }]);
    
    // ❌ BAD - Direct update
    // setMessages([...messages, newMessage]);
  };
}
```

---

## 🧪 Testing Patterns

### Test Single Context
```typescript
import { render } from '@testing-library/react';
import { WalletProvider } from './contexts';

test('component uses wallet', () => {
  render(
    <WalletProvider initialBalance={100}>
      <MyComponent />
    </WalletProvider>
  );
  
  // assertions
});
```

### Test Multiple Contexts
```typescript
import { AllProviders } from './contexts';

test('component uses multiple contexts', () => {
  render(
    <AllProviders>
      <MyComponent />
    </AllProviders>
  );
  
  // assertions
});
```

### Mock Context
```typescript
import { WalletContext } from './contexts/WalletContext';

const mockWallet = {
  balance: 100,
  refreshWallet: jest.fn(),
  // ... other properties
};

test('with mock', () => {
  render(
    <WalletContext.Provider value={mockWallet}>
      <MyComponent />
    </WalletContext.Provider>
  );
});
```

---

## ⚠️ Common Mistakes

### ❌ Using outside provider
```typescript
// This will throw an error
function MyComponent() {
  const { balance } = useWalletContext(); // Error!
}

// ✅ Fix: Wrap with provider
<WalletProvider>
  <MyComponent />
</WalletProvider>
```

### ❌ Direct state mutation
```typescript
// ❌ BAD
messages.push(newMessage);
setMessages(messages);

// ✅ GOOD
setMessages(prev => [...prev, newMessage]);
```

### ❌ Consuming entire context
```typescript
// ❌ BAD - Re-renders on any change
const allContext = useModelContext();

// ✅ GOOD - Only re-renders when selectedModel changes
const { selectedModel } = useModelContext();
```

### ❌ Stale closures
```typescript
// ❌ BAD
const handleClick = () => {
  setMessages([...messages, newMessage]); // Stale!
};

// ✅ GOOD
const handleClick = () => {
  setMessages(prev => [...prev, newMessage]);
};
```

---

## 🔍 Debugging Tips

### Check if provider is present
```typescript
// Add to component
const context = useWalletContext();
console.log('Wallet context:', context);
```

### Check re-renders
```typescript
// Add to component
useEffect(() => {
  console.log('Component re-rendered');
});
```

### Check context updates
```typescript
// In context provider
useEffect(() => {
  console.log('Balance updated:', balance);
}, [balance]);
```

---

## 📖 More Resources

- **Full Documentation:** [README.md](./README.md)
- **Migration Guide:** [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md)
- **Architecture:** [ARCHITECTURE_DIAGRAM.md](./ARCHITECTURE_DIAGRAM.md)
- **Implementation:** [IMPLEMENTATION_SUMMARY.md](./IMPLEMENTATION_SUMMARY.md)

---

## 🆘 Need Help?

1. Check the [README.md](./README.md) for detailed usage
2. Review [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) for examples
3. Look at test files for patterns
4. Ask in #frontend-architecture

---

**Print this and keep it handy!** 📄
