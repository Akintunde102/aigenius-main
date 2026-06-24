# Domain Contexts

## 🎯 Purpose

This directory contains domain-specific React contexts that replace the monolithic `useModelInterface` hook. Each context manages a specific domain of application state with clear boundaries and responsibilities.

## 📁 Structure

```
contexts/
├── ModelContext.tsx       # Model selection, search, filtering
├── ChatContext.tsx        # Messages, sessions, history
├── WalletContext.tsx      # Balance, payments, gating
├── UIContext.tsx          # Modals, sidebars, UI state
├── index.tsx              # Exports and AllProviders
├── README.md              # This file
└── MIGRATION_GUIDE.md     # Migration instructions
```

## 🏗️ Architecture Principles

### 1. Single Responsibility
Each context manages ONE domain:
- **ModelContext** = Models only
- **ChatContext** = Chat only
- **WalletContext** = Wallet only
- **UIContext** = UI state only

### 2. Clear Boundaries
No cross-domain logic in contexts. Use composition in components:
```typescript
// ✅ GOOD - Compose in component
function ChatColumn() {
  const { selectedModel } = useModelContext();
  const { balance } = useWalletContext();
  
  const canSend = balance > selectedModel.cost;
}

// ❌ BAD - Cross-domain logic in context
// Don't put wallet checks in ModelContext
```

### 3. Minimal API Surface
Each context exposes only what's needed:
```typescript
// ✅ GOOD - Focused API
const { balance, refreshWallet } = useWalletContext();

// ❌ BAD - Exposing internals
const { balance, _internalState, _privateMethod } = useWalletContext();
```

### 4. Immutable Updates
Use functional updates for state:
```typescript
// ✅ GOOD
setMessages(prev => [...prev, newMessage]);

// ❌ BAD
messages.push(newMessage);
setMessages(messages);
```

## 📚 Context Reference

### ModelContext

**Purpose:** Manage model selection, search, and filtering

**Key Features:**
- Model list management
- Search and filtering
- Favorites/pinned models
- Recent models tracking
- Sorting and ordering

**Usage:**
```typescript
import { useModelContext } from './contexts';

function ModelPicker() {
  const {
    models,
    selectedModel,
    selectModel,
    searchQuery,
    setSearchQuery,
    filteredModels,
  } = useModelContext();
  
  return (
    <div>
      <input 
        value={searchQuery} 
        onChange={(e) => setSearchQuery(e.target.value)} 
      />
      {filteredModels.map(model => (
        <button 
          key={model.id}
          onClick={() => selectModel(model)}
        >
          {model.name}
        </button>
      ))}
    </div>
  );
}
```

**API:**
```typescript
interface ModelContextValue {
  models: Model[];
  selectedModel: Model | null;
  selectModel: (model: Model | null) => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  filteredModels: Model[];
  pinnedModelIds: string[];
  togglePinModel: (modelId: string) => void;
  recentModels: string[];
  // ... see ModelContext.tsx for full API
}
```

---

### ChatContext

**Purpose:** Manage chat messages, sessions, and history

**Key Features:**
- Message management per session
- Session switching
- Chat history
- Loading/streaming states per session
- Message CRUD operations

**Usage:**
```typescript
import { useChatContext } from './contexts';

function ChatMessages() {
  const {
    messages,
    setMessages,
    currentSessionId,
    isLoading,
    isStreaming,
  } = useChatContext();
  
  const addMessage = (text: string) => {
    setMessages(prev => [...prev, {
      role: 'user',
      content: text,
      timestamp: Date.now(),
    }]);
  };
  
  return (
    <div>
      {messages.map((msg, i) => (
        <div key={i}>{msg.content}</div>
      ))}
      {isLoading && <Spinner />}
    </div>
  );
}
```

**API:**
```typescript
interface ChatContextValue {
  messages: ChatMessage[];
  setMessages: (updater: ...) => void;
  currentSessionId: string | null;
  chatHistory: ChatSession[];
  switchToSession: (sessionId: string) => void;
  createNewSession: () => string;
  isLoading: boolean;
  isStreaming: boolean;
  // ... see ChatContext.tsx for full API
}
```

---

### WalletContext

**Purpose:** Manage wallet balance and payment state

**Key Features:**
- Balance tracking
- Refresh from backend
- Insufficient funds detection
- Payment flow support

**Usage:**
```typescript
import { useWalletContext } from './contexts';

function WalletDisplay() {
  const {
    balance,
    refreshWallet,
    isInsufficientFunds,
    normalizedBalance,
  } = useWalletContext();
  
  const handleRefresh = async () => {
    const newBalance = await refreshWallet();
    console.log('Updated balance:', newBalance);
  };
  
  return (
    <div>
      <p>Balance: ${normalizedBalance.toFixed(2)}</p>
      <button onClick={handleRefresh}>Refresh</button>
      {isInsufficientFunds(10) && (
        <p>Insufficient funds for this model</p>
      )}
    </div>
  );
}
```

**API:**
```typescript
interface WalletContextValue {
  balance: number | null;
  setBalance: (balance: number | null) => void;
  refreshWallet: () => Promise<number | null>;
  isInsufficientFunds: (required: number) => boolean;
  normalizedBalance: number;
  isLoading: boolean;
  error: string | null;
}
```

---

### UIContext

**Purpose:** Manage UI state (modals, sidebars, loading indicators)

**Key Features:**
- Modal visibility management
- Sidebar state
- Loading indicators
- Drag & drop state
- Upload progress

**Usage:**
```typescript
import { useUIContext } from './contexts';

function ModelSelectionButton() {
  const {
    showModelSelectionModal,
    openModelSelectionModal,
    closeModelSelectionModal,
  } = useUIContext();
  
  return (
    <>
      <button onClick={openModelSelectionModal}>
        Select Model
      </button>
      {showModelSelectionModal && (
        <Modal onClose={closeModelSelectionModal}>
          {/* Modal content */}
        </Modal>
      )}
    </>
  );
}
```

**API:**
```typescript
interface UIContextValue {
  // Modals
  showModelSelectionModal: boolean;
  openModelSelectionModal: () => void;
  closeModelSelectionModal: () => void;
  
  // Sidebars
  mainSidebarVisible: boolean;
  toggleMainSidebar: () => void;
  
  // States
  uploading: boolean;
  uploadProgress: number;
  dragActive: boolean;
  // ... see UIContext.tsx for full API
}
```

## 🚀 Quick Start

### 1. Wrap Your App
```typescript
import { AllProviders } from './contexts';

function App() {
  return (
    <AllProviders>
      <YourApp />
    </AllProviders>
  );
}
```

### 2. Use in Components
```typescript
import { useModelContext, useChatContext } from './contexts';

function ChatInterface() {
  const { selectedModel } = useModelContext();
  const { messages, setMessages } = useChatContext();
  
  // Your component logic
}
```

### 3. No More Prop Drilling!
```typescript
// ❌ OLD WAY
<Parent>
  <Child1 prop1={x} prop2={y} prop3={z} />
  <Child2 prop1={x} prop2={y} prop3={z} />
</Parent>

// ✅ NEW WAY
<Parent>
  <Child1 />
  <Child2 />
</Parent>
```

## 🧪 Testing

### Test Setup
```typescript
import { render } from '@testing-library/react';
import { AllProviders } from './contexts';

function renderWithContexts(ui: React.ReactElement) {
  return render(
    <AllProviders>
      {ui}
    </AllProviders>
  );
}
```

### Mock Contexts
```typescript
import { ModelContext } from './contexts/ModelContext';

const mockValue = {
  models: [{ id: '1', name: 'Test' }],
  selectedModel: null,
  selectModel: jest.fn(),
  // ... other required properties
};

test('with mock', () => {
  render(
    <ModelContext.Provider value={mockValue}>
      <YourComponent />
    </ModelContext.Provider>
  );
});
```

## 📊 Performance

### Selective Consumption
Only consume what you need to minimize re-renders:

```typescript
// ❌ BAD - Re-renders on ANY context change
const allContext = useModelContext();

// ✅ GOOD - Only re-renders when selectedModel changes
const { selectedModel } = useModelContext();
```

### Memoization
Contexts use `useMemo` internally for stable references:

```typescript
// Context automatically memoizes
const value = useMemo(() => ({
  models,
  selectedModel,
  selectModel,
  // ...
}), [models, selectedModel, selectModel]);
```

### Context Splitting
We split contexts by domain to prevent unnecessary re-renders:

```typescript
// ✅ GOOD - Separate contexts
<ModelProvider>
  <ChatProvider>
    <WalletProvider>
      {/* Only re-renders affected components */}
    </WalletProvider>
  </ChatProvider>
</ModelProvider>

// ❌ BAD - Single giant context
<AppProvider>
  {/* Everything re-renders on any change */}
</AppProvider>
```

## 🔒 Best Practices

### 1. Don't Expose Setters Unnecessarily
```typescript
// ✅ GOOD - Expose actions
const { openModal, closeModal } = useUIContext();

// ❌ BAD - Expose raw setter
const { setShowModal } = useUIContext();
```

### 2. Use Functional Updates
```typescript
// ✅ GOOD
setMessages(prev => [...prev, newMessage]);

// ❌ BAD
setMessages([...messages, newMessage]);
```

### 3. Keep Context Logic Simple
```typescript
// ✅ GOOD - Simple state management
const [balance, setBalance] = useState(null);

// ❌ BAD - Complex business logic in context
const [balance, setBalance] = useState(null);
const [transactions, setTransactions] = useState([]);
const [pendingPayments, setPendingPayments] = useState([]);
// ... too much!
```

### 4. Compose in Components
```typescript
// ✅ GOOD - Compose multiple contexts
function SendButton() {
  const { selectedModel } = useModelContext();
  const { balance } = useWalletContext();
  const { messages } = useChatContext();
  
  const canSend = balance > selectedModel.cost && messages.length > 0;
  
  return <button disabled={!canSend}>Send</button>;
}
```

## 🐛 Common Issues

### Issue: "Hook must be used within Provider"
**Solution:** Wrap component tree with provider
```typescript
<ModelProvider>
  <YourComponent />
</ModelProvider>
```

### Issue: Stale closures
**Solution:** Use functional updates
```typescript
// ❌ BAD
setMessages([...messages, newMessage]);

// ✅ GOOD
setMessages(prev => [...prev, newMessage]);
```

### Issue: Too many re-renders
**Solution:** Split contexts or use selective consumption
```typescript
// Only consume what you need
const { selectedModel } = useModelContext();
// Not: const allContext = useModelContext();
```

## 📖 Further Reading

- [React Context Best Practices](https://react.dev/learn/passing-data-deeply-with-context)
- [When to Use Context](https://react.dev/learn/scaling-up-with-reducer-and-context)
- [MIGRATION_GUIDE.md](./MIGRATION_GUIDE.md) - How to migrate from old code
- [REFACTORING_PLAN.md](../REFACTORING_PLAN.md) - Overall refactoring strategy

## 🤝 Contributing

When adding new context features:

1. **Keep it focused** - One domain per context
2. **Document the API** - Add JSDoc comments
3. **Write tests** - Test context in isolation
4. **Update this README** - Keep docs current
5. **Follow patterns** - Match existing context structure

---

**Status:** 🟢 Production Ready
**Last Updated:** 2026-05-10
**Maintainer:** Frontend Architecture Team
