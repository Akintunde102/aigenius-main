# Model Interface Session Management

> **Full frontend map:** see [`../../../../ARCHITECTURE.md`](../../../../ARCHITECTURE.md) for routes, layer conventions, and where to edit other areas (streaming, models, wallet).

This document describes the simplified session management system for the Model Interface component.

## Overview

The session management system follows a **"state-first, backend-sync"** approach:

1. **On page load**: Fetch all conversations from backend and store in React state + local storage
2. **On conversation click**: Load immediately from state (instant response)
3. **After loading from state**: Check backend for updates and gracefully update view/state if needed

## Key Hooks

### 1. useSessionSwitcher Hook
```typescript
// UI session switching utilities
const {
    switchToSession,
    createAndSwitchToNewSession,
    isSessionActive
} = useSessionSwitcher();
```

### 2. useChatOperationsRefined Hook
```typescript
// Enhanced chat operations with session ID awareness
const {
    handleSend,
    handleStop
} = useChatOperationsRefined({
    selectedModel,
    chat,
    setChat,
    currentSessionId,
    setCurrentSessionId,
    // ... other props
});
```

## Usage Examples

### Session Switching
```typescript
import { useSessionSwitcher } from './hooks';

function HistorySidebar() {
    const { switchToSession, isSessionActive } = useSessionSwitcher();

    const onSessionClick = async (session: ChatSession) => {
        // This will:
        // 1. Load from state immediately (instant)
        // 2. Check backend for updates (non-blocking)
        // 3. Update view/state if there are changes
        await switchToSession(session, setChat, setCurrentSessionId, setChatHistory, chatHistory);
    };

    return (
        <div>
            {sessions.map(session => (
                <div 
                    key={session.id}
                    className={isSessionActive(session.id) ? 'active' : ''}
                    onClick={() => onSessionClick(session)}
                >
                    {session.title}
                </div>
            ))}
        </div>
    );
}
```

### Creating New Sessions
```typescript
import { useSessionSwitcher } from './hooks';

function NewChatButton() {
    const { createAndSwitchToNewSession } = useSessionSwitcher();

    const onNewChat = async () => {
        if (models.length > 0) {
            await createAndSwitchToNewSession(models[0].id, setChat, setCurrentSessionId);
        }
    };

    return <button onClick={onNewChat}>New Chat</button>;
}
```

## Data Flow

### 1. Initial Load
```typescript
// On page load, fetch all conversations
const { getAllChatResources } = await import('@/lib/utils/modelChatConversationUtils');
const resources = await getAllChatResources();

// Store in state and local storage
setChatHistory(resources.chatHistory);
setSavedChats(resources.savedChats);
// ... etc
```

### 2. Conversation Selection
```typescript
const switchToSession = async (session, setChat, setCurrentSessionId, setChatHistory, chatHistory) => {
    // 1. Load from state immediately (instant response)
    setChat(session.messages);
    setCurrentSessionId(session.id);

    // 2. Check backend for updates using single conversation endpoint (efficient)
    try {
        const updatedConversation = await getConversation(session.id);
        if (updatedConversation && hasUpdates) {
            // Update both view and state gracefully
            setChat(updatedConversation.session.messages);
            updateChatHistoryState();
        }
    } catch (error) {
        // Keep using state data even if backend check fails
        console.warn('Backend check failed, using state data');
    }
};
```

## Backend Endpoints

### Efficient Single Conversation Fetching
- **`GET /gateway/*/model-chats/conversation/:id`** - Get a single conversation by ID
- **`GET /gateway/*/model-chats/resources`** - Get all chat resources (only on page load)

The system now uses the efficient single conversation endpoint instead of calling the full resources endpoint on every conversation selection.

## Benefits

- **Instant Response**: Conversations load immediately from state
- **Always Fresh**: Data is refreshed from backend on every page load
- **Graceful Updates**: Backend changes are applied without blocking the UI
- **Offline Capability**: Works even when backend is unavailable
- **Efficient**: No unnecessary API calls when switching between conversations

## Migration from Old System

The old complex session management system has been replaced with this simplified approach:

- ❌ `useSessionManager` - Removed
- ❌ `SessionManager` class - Removed  
- ❌ Complex auto-save logic - Simplified
- ✅ `useSessionSwitcher` - Enhanced with new flow
- ✅ State-first loading - Implemented
- ✅ Backend sync - Implemented
