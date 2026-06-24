# ChatHistoryListItem Refactor

This directory contains the refactored `ChatHistoryListItem` component, broken down into smaller, more maintainable pieces.

## Structure

```
ChatHistoryListItem/
├── ChatHistoryListItem.tsx    # Main component
├── components/                 # UI sub-components
│   ├── ActionButtons.tsx       # Star and delete buttons
│   ├── ConfirmationModal.tsx   # Reusable confirmation modal
│   └── SessionInfo.tsx         # Session title and cost display
├── hooks/                      # Custom hooks
│   ├── useCostCalculation.ts   # Cost calculation logic
│   ├── useDeleteSession.ts     # Delete session logic
│   └── useStarSession.ts       # Star/unstar session logic
├── utils/                      # Utility functions
│   └── styles.ts               # Styling utilities
├── types.ts                    # TypeScript type definitions
├── index.ts                    # Public exports
└── README.md                   # This file
```

## Key Improvements

1. **Separation of Concerns**: Logic is separated into focused hooks and components
2. **Reusability**: Sub-components can be reused elsewhere if needed
3. **Maintainability**: Each file has a single responsibility
4. **Type Safety**: Improved TypeScript types and interfaces
5. **Reduced Props**: Complex prop drilling is replaced with grouped action objects
6. **Mobile Detection**: Moved out of component to parent for better testability
7. **Cleaner Styling**: Styling logic extracted to utility functions

## Usage

```tsx
import ChatHistoryListItem, { ChatHistoryActions } from './ChatHistoryListItem';

const actions: ChatHistoryActions = {
  removeChatHistorySession,
  removeChatHistorySessionById,
  setChatHistory,
  getChatHistory,
  onStarToggle
};

<ChatHistoryListItem
  session={session}
  idx={idx}
  isActive={isActive}
  models={models}
  deletingIdx={deletingIdx}
  setDeletingIdx={setDeletingIdx}
  onSelect={handleSelect}
  isStarred={isStarred}
  isMobile={isMobile}
  actions={actions}
/>
```
