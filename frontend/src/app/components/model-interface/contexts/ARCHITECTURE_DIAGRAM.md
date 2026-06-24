# Context Architecture Diagram

## 🏗️ New Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         ModelInterface                          │
│                     (Orchestration Layer)                       │
└─────────────────────────────────────────────────────────────────┘
                                 │
                                 │ wraps with
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                         AllProviders                            │
│  ┌───────────────────────────────────────────────────────────┐ │
│  │                      UIProvider                           │ │
│  │  ┌─────────────────────────────────────────────────────┐ │ │
│  │  │                  WalletProvider                     │ │ │
│  │  │  ┌───────────────────────────────────────────────┐ │ │ │
│  │  │  │              ModelProvider                    │ │ │ │
│  │  │  │  ┌─────────────────────────────────────────┐ │ │ │ │
│  │  │  │  │           ChatProvider                  │ │ │ │ │
│  │  │  │  │  ┌───────────────────────────────────┐ │ │ │ │ │
│  │  │  │  │  │      Component Tree              │ │ │ │ │ │
│  │  │  │  │  │                                   │ │ │ │ │ │
│  │  │  │  │  │  ┌─────────────────────────────┐ │ │ │ │ │ │
│  │  │  │  │  │  │     ChatColumn              │ │ │ │ │ │ │
│  │  │  │  │  │  │  - useChatContext()         │ │ │ │ │ │ │
│  │  │  │  │  │  │  - useModelContext()        │ │ │ │ │ │ │
│  │  │  │  │  │  │  - useWalletContext()       │ │ │ │ │ │ │
│  │  │  │  │  │  └─────────────────────────────┘ │ │ │ │ │ │
│  │  │  │  │  │                                   │ │ │ │ │ │
│  │  │  │  │  │  ┌─────────────────────────────┐ │ │ │ │ │ │
│  │  │  │  │  │  │     ChatHistorySidebar      │ │ │ │ │ │ │
│  │  │  │  │  │  │  - useChatContext()         │ │ │ │ │ │ │
│  │  │  │  │  │  │  - useWalletContext()       │ │ │ │ │ │ │
│  │  │  │  │  │  │  - useUIContext()           │ │ │ │ │ │ │
│  │  │  │  │  │  └─────────────────────────────┘ │ │ │ │ │ │
│  │  │  │  │  │                                   │ │ │ │ │ │
│  │  │  │  │  │  ┌─────────────────────────────┐ │ │ │ │ │ │
│  │  │  │  │  │  │     ModelSelectionModal     │ │ │ │ │ │ │
│  │  │  │  │  │  │  - useModelContext()        │ │ │ │ │ │ │
│  │  │  │  │  │  │  - useUIContext()           │ │ │ │ │ │ │
│  │  │  │  │  │  └─────────────────────────────┘ │ │ │ │ │ │
│  │  │  │  │  └───────────────────────────────────┘ │ │ │ │ │
│  │  │  │  └─────────────────────────────────────────┘ │ │ │ │
│  │  │  └───────────────────────────────────────────────┘ │ │ │
│  │  └─────────────────────────────────────────────────────┘ │ │
│  └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📊 Context Responsibilities

```
┌──────────────────┐
│  ModelContext    │  Models, Search, Filters
├──────────────────┤
│ • models[]       │  ← Model list
│ • selectedModel  │  ← Current selection
│ • searchQuery    │  ← Search text
│ • filteredModels │  ← Computed results
│ • pinnedModelIds │  ← Favorites
│ • recentModels   │  ← History
└──────────────────┘

┌──────────────────┐
│  ChatContext     │  Messages, Sessions, History
├──────────────────┤
│ • messages[]     │  ← Current chat
│ • chatHistory[]  │  ← All sessions
│ • currentSession │  ← Active session
│ • isLoading      │  ← Per-session state
│ • isStreaming    │  ← Per-session state
└──────────────────┘

┌──────────────────┐
│  WalletContext   │  Balance, Payments
├──────────────────┤
│ • balance        │  ← Current balance
│ • refreshWallet  │  ← Fetch from backend
│ • isInsufficient │  ← Check funds
│ • isLoading      │  ← Loading state
│ • error          │  ← Error state
└──────────────────┘

┌──────────────────┐
│  UIContext       │  Modals, Sidebars, UI State
├──────────────────┤
│ • showModal*     │  ← Modal visibility
│ • openModal*     │  ← Open actions
│ • closeModal*    │  ← Close actions
│ • sidebarVisible │  ← Sidebar state
│ • uploading      │  ← Upload state
│ • dragActive     │  ← Drag state
└──────────────────┘
```

---

## 🔄 Data Flow

### Before (❌ Prop Drilling)
```
ModelInterface
    │
    ├─ useModelInterface() ──┐
    │                        │ Returns 100+ properties
    │                        │
    ▼                        ▼
ChatColumn                   │
    │                        │
    │ Receives 30+ props ────┘
    │
    ├─ ChatMessages
    │     │
    │     │ Receives 15+ props
    │     │
    │     ▼
    │  MessageBubble
    │     │
    │     │ Receives 8+ props
    │     │
    │     ▼
    │  (Finally uses 2 props)
    │
    └─ ChatInput
          │
          │ Receives 12+ props
          │
          ▼
       (Finally uses 3 props)
```

### After (✅ Context Consumption)
```
ModelInterface
    │
    │ Wraps with AllProviders
    │
    ▼
ChatColumn
    │
    │ useChatContext() ──────┐
    │ useModelContext() ─────┤ Direct access
    │ useWalletContext() ────┤ No props!
    │ useUIContext() ────────┘
    │
    ├─ ChatMessages
    │     │
    │     │ useChatContext() ─── Direct access
    │     │
    │     ▼
    │  MessageBubble
    │     │
    │     │ useChatContext() ─── Direct access
    │     │
    │     ▼
    │  (Uses what it needs)
    │
    └─ ChatInput
          │
          │ useChatContext() ─── Direct access
          │ useModelContext() ── Direct access
          │
          ▼
       (Uses what it needs)
```

---

## 🎯 Component Access Patterns

### Pattern 1: Single Context
```typescript
function WalletDisplay() {
  const { balance, refreshWallet } = useWalletContext();
  
  return (
    <div>
      Balance: ${balance}
      <button onClick={refreshWallet}>Refresh</button>
    </div>
  );
}
```

### Pattern 2: Multiple Contexts
```typescript
function SendButton() {
  const { selectedModel } = useModelContext();
  const { balance } = useWalletContext();
  const { messages } = useChatContext();
  
  const canSend = balance > selectedModel.cost && messages.length > 0;
  
  return <button disabled={!canSend}>Send</button>;
}
```

### Pattern 3: Conditional Logic
```typescript
function ChatInterface() {
  const { isInsufficientFunds } = useWalletContext();
  const { selectedModel } = useModelContext();
  const { openWalletModal } = useUIContext();
  
  const handleSend = () => {
    if (isInsufficientFunds(selectedModel.cost)) {
      openWalletModal();
      return;
    }
    // Send message
  };
}
```

---

## 🔀 State Update Flow

### Example: Sending a Message

```
User clicks "Send"
    │
    ▼
ChatInput component
    │
    ├─ useChatContext()
    │     │
    │     ├─ setMessages(prev => [...prev, newMessage])
    │     │     │
    │     │     ▼
    │     │  ChatContext updates state
    │     │     │
    │     │     ▼
    │     │  All components using useChatContext() re-render
    │     │     │
    │     │     ├─ ChatMessages (shows new message)
    │     │     ├─ ChatHistorySidebar (updates count)
    │     │     └─ MessageCounter (updates total)
    │     │
    │     └─ setLoadingForSession(sessionId, true)
    │           │
    │           ▼
    │        Only components checking isLoading re-render
    │
    ├─ useWalletContext()
    │     │
    │     └─ setBalance(balance - cost)
    │           │
    │           ▼
    │        Only components using balance re-render
    │
    └─ useModelContext()
          │
          └─ addToRecent(modelId)
                │
                ▼
             Only components using recentModels re-render
```

**Key Benefit:** Selective re-renders! Only affected components update.

---

## 📦 Context Isolation

```
┌─────────────────────────────────────────────────────────┐
│                    Application State                    │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐ │
│  │   Models     │  │    Chat      │  │   Wallet     │ │
│  │              │  │              │  │              │ │
│  │ Independent  │  │ Independent  │  │ Independent  │ │
│  │   Domain     │  │   Domain     │  │   Domain     │ │
│  │              │  │              │  │              │ │
│  │ No coupling  │  │ No coupling  │  │ No coupling  │ │
│  └──────────────┘  └──────────────┘  └──────────────┘ │
│                                                         │
│  ┌──────────────┐                                      │
│  │      UI      │                                      │
│  │              │                                      │
│  │ Independent  │                                      │
│  │   Domain     │                                      │
│  │              │                                      │
│  │ No coupling  │                                      │
│  └──────────────┘                                      │
│                                                         │
└─────────────────────────────────────────────────────────┘
         │                  │                  │
         │                  │                  │
         ▼                  ▼                  ▼
    Components         Components         Components
    consume            consume            consume
    what they          what they          what they
    need               need               need
```

---

## 🧪 Testing Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Test Isolation                       │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Test ModelContext                                      │
│  ┌──────────────────────────────────────────────────┐  │
│  │ <ModelProvider>                                  │  │
│  │   <TestComponent />                              │  │
│  │ </ModelProvider>                                 │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  Test ChatContext                                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │ <ChatProvider>                                   │  │
│  │   <TestComponent />                              │  │
│  │ </ChatProvider>                                  │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
│  Test Integration                                       │
│  ┌──────────────────────────────────────────────────┐  │
│  │ <ModelProvider>                                  │  │
│  │   <ChatProvider>                                 │  │
│  │     <TestComponent />                            │  │
│  │   </ChatProvider>                                │  │
│  │ </ModelProvider>                                 │  │
│  └──────────────────────────────────────────────────┘  │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

## 🎨 Visual Comparison

### Before: Tangled Dependencies
```
     useModelInterface
            │
    ┌───────┼───────┐
    │       │       │
    ▼       ▼       ▼
  Models  Chat  Wallet  UI  Audio  Files  ...
    │       │       │     │    │      │
    └───────┴───────┴─────┴────┴──────┘
            │
      Everything coupled
      Change one = risk all
```

### After: Clean Separation
```
  ModelContext   ChatContext   WalletContext   UIContext
       │              │              │             │
       │              │              │             │
   Independent    Independent   Independent   Independent
       │              │              │             │
       └──────────────┴──────────────┴─────────────┘
                          │
                   Components compose
                   what they need
```

---

## 📈 Performance Benefits

```
Before: Single Giant Context
┌─────────────────────────────────────┐
│  Any state change                   │
│         ↓                           │
│  ALL components re-render           │
│         ↓                           │
│  Expensive! 😱                      │
└─────────────────────────────────────┘

After: Domain Contexts
┌─────────────────────────────────────┐
│  Model state changes                │
│         ↓                           │
│  Only components using              │
│  useModelContext() re-render        │
│         ↓                           │
│  Efficient! 🚀                      │
└─────────────────────────────────────┘
```

---

## 🎯 Summary

### Key Improvements
1. ✅ **Separation of Concerns** - Each context owns one domain
2. ✅ **No Prop Drilling** - Direct context access
3. ✅ **Selective Re-renders** - Only affected components update
4. ✅ **Testability** - Contexts testable in isolation
5. ✅ **Maintainability** - Clear ownership and boundaries

### Architecture Wins
- 🏆 **100+ properties** → **4 focused contexts**
- 🏆 **30+ props** → **0 props** (context access)
- 🏆 **400+ line hook** → **140-350 line contexts**
- 🏆 **Monolithic** → **Modular**
- 🏆 **Coupled** → **Decoupled**

---

**Status:** 🟢 Architecture Complete
**Next:** Migration to new architecture
