# Part Four — UI & Frontend Rules (Rules 45–58)

> These rules govern the React/Next.js frontend layer: state management, component architecture, realtime event handling, performance, and file organisation.

---

### Rule 45 — URL_AS_STATE: The session ID lives in the URL — nowhere else

The URL is `/chat/[sessionId]`. The `sessionId` is never stored in React state, localStorage, a context provider, or Zustand. Read from URL params and pass down as a prop.

```tsx
// app/chat/[sessionId]/page.tsx
export default function ChatPage(
  { params }: { params: { sessionId: string } }
) {
  return <ChatContainer sessionId={params.sessionId} />
}
```

### Rule 46 — SERVER_VS_CLIENT_STATE: Never store server data in `useState`

Data that lives on the server (messages, session, agent status) belongs in TanStack Query. `useState` is for ephemeral UI state only.

```typescript
// ❌ Wrong
const [messages, setMessages] = useState([])

// ✅ Right
const { data: messages = [] } = useQuery({
  queryKey: ["messages", sessionId],
  queryFn:  () => fetchMessages(sessionId),
})
```

### Rule 47 — SOCKET_HOOK: One custom hook owns the WebSocket per session

`useSessionSocket(sessionId)` opens the socket, subscribes to all events, routes events into the TanStack Query cache, and closes the socket on cleanup. Instantiated once at the session page level.

```typescript
const socket = io(API_URL, { query: { sessionId } })
socket.on("message:new", msg =>
  queryClient.setQueryData(["messages", sessionId], old => [...old, msg])
)
socket.on("agent:update", event =>
  queryClient.setQueryData(["agent-status", sessionId], event)
)
socket.on("token:stream", ({ messageId, token }) =>
  queryClient.setQueryData(["messages", sessionId], old =>
    old.map(m => m.id === messageId ? { ...m, content: m.content + token } : m)
  )
)
return () => socket.disconnect()
```

### Rule 48 — CONTAINER_PRESENTER: Separate container from presenter

Container components fetch data and manage state. Presenter components receive plain props and render. Presenters contain no hooks that touch the network.

```tsx
// Container
const ChatContainer = ({ sessionId }) => {
  const { data: messages } = useQuery([...])
  const { sendMessage } = useSessionSocket(sessionId)
  return <ChatView messages={messages} onSend={sendMessage} />
}

// Presenter — pure props, zero network logic
const ChatView = ({ messages, onSend }: Props) => (
  <div>
    <MessageList messages={messages} />
    <MessageInput onSend={onSend} />
  </div>
)
```

### Rule 49 — OPTIMISTIC_UPDATES: Show messages optimistically

On send, immediately add the message to the TanStack Query cache with a temporary ID and status `"sending"`. On error, roll back to the snapshot. On settle, invalidate the query to reconcile.

### Rule 50 — STREAMING_TOKENS: Append — never replace

When a `token:stream` event arrives, find the in-progress message in the cache and append the token to its `content`. Never replace the entire messages array on each token.

```typescript
socket.on("token:stream", ({ messageId, token }) => {
  queryClient.setQueryData(["messages", sessionId], (old = []) =>
    old.map(m => m.id === messageId ? { ...m, content: m.content + token } : m)
  )
})
```

### Rule 51 — VIRTUALISE: Never render all messages

Use `@tanstack/react-virtual` to render only the messages currently visible plus an overscan buffer. 500 messages = 500 DOM nodes = frozen UI.

```typescript
const virtualizer = useVirtualizer({
  count:            messages.length,
  getScrollElement: () => parentRef.current,
  estimateSize:     () => 80,
  overscan:         10,
})
useEffect(() => {
  virtualizer.scrollToIndex(messages.length - 1, { behavior: "smooth" })
}, [messages.length])
```

### Rule 52 — MEMO_BOUNDARIES: Memoize at component boundaries — not everywhere

Wrap only: the message bubble (so 499 bubbles don't re-render when the 500th arrives) and any component receiving a callback prop. Over-memoizing adds noise.

### Rule 53 — NO_LOGIC_IN_COMPONENTS: Extract all business logic

A component file reads like a template — it calls hooks and renders JSX. Filtering, formatting, sorting are pure functions in separate utility files.

```typescript
const useMessageGroups = (messages: Message[]) =>
  useMemo(() => pipe(messages, filterDeleted, sortByDate, groupByDate), [messages])

const ChatView = ({ messages }) => {
  const groups = useMessageGroups(messages)
  return groups.map(g => <MessageGroup key={g.date} group={g} />)
}
```

### Rule 54 — CUSTOM_HOOKS: Extract all side effects into custom hooks

Any `useEffect`, WebSocket subscription, browser API call, or mutation must live in a custom hook — never inline in a component. Named `use[Domain][Noun]`.

### Rule 55 — FEATURE_FOLDERS_UI: Mirror backend domain structure

```
features/
  chat/
    ChatContainer · ChatView · MessageList · MessageBubble · MessageInput
    hooks/ — useSessionSocket · useSendMessage
  agents/
    AgentStatusBar · AgentEventFeed
    hooks/ — useAgentStatus
shared/components/ — Button · Skeleton · Avatar
```

No feature folder imports from another feature folder.

### Rule 56 — TYPED_SOCKETS: Type all socket events end-to-end

Define a shared `SocketEvents` type imported by both server and client. An untyped `socket.emit` is a compile error.

```typescript
type SocketEvents = {
  "message:new":  (msg:   Message)     => void
  "agent:update": (evt:   AgentStatus) => void
  "token:stream": (data:  { messageId: string; token: string }) => void
  "error":        (error: { code: string; message: string })    => void
}
```

### Rule 57 — LAZY_ROUTES: Code-split by page

Use `next/dynamic` with `ssr: false` for heavy client-only components.

```typescript
const VirtualMessageList = dynamic(
  () => import("../features/chat/MessageList"),
  { ssr: false }
)
```

### Rule 58 — ERROR_BOUNDARIES: Wrap every page in an error boundary

Every session page has a corresponding `error.tsx` and `loading.tsx`. A broken session must not break adjacent sessions.
