import { ChatMessage } from "@/app/components/model-interface/shared/types";

const STORAGE_KEY = "conversation_scroll_memory_v1";

export interface ConversationScrollState {
  scrollTop: number;
  messageSignature: string;
}

type ConversationScrollMap = Record<string, ConversationScrollState>;
type ConversationSignatureMap = Record<string, string>;

function canUseStorage(): boolean {
  return typeof globalThis !== "undefined" && typeof globalThis.localStorage !== "undefined";
}

function readConversationScrollMap(): ConversationScrollMap {
  if (!canUseStorage()) {
    return {};
  }

  try {
    const rawValue = globalThis.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return {};
    }

    const parsed = JSON.parse(rawValue) as ConversationScrollMap;
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function writeConversationScrollMap(scrollMap: ConversationScrollMap): void {
  if (!canUseStorage()) {
    return;
  }

  try {
    globalThis.localStorage.setItem(STORAGE_KEY, JSON.stringify(scrollMap));
  } catch {
    // Ignore storage quota / privacy mode failures.
  }
}

export function buildConversationMessageSignature(
  messages: ChatMessage[],
): string {
  const visibleMessages = messages.filter((message) => message.role !== "system");
  const lastMessage = visibleMessages[visibleMessages.length - 1];

  return [
    visibleMessages.length,
    lastMessage?.id ?? "",
    lastMessage?.timestamp ?? "",
    lastMessage?.role ?? "",
  ].join(":");
}

function countVisibleMessages(messages: ChatMessage[]): number {
  return messages.filter((message) => message.role !== "system").length;
}

function getVisibleMessages(messages: ChatMessage[]): ChatMessage[] {
  return messages.filter((message) => message.role !== "system");
}

/** Stable identity for prefix comparisons across client/server snapshots. */
export function messageStableKey(message: ChatMessage): string {
  return message.messageId ?? message.id ?? `ts_${message.timestamp}`;
}

/**
 * True when the first `local` visible messages match the server snapshot in order.
 * Used to distinguish "server appended new turns" from "local branched via replay".
 */
export function localMessagesMatchServerPrefix(
  localMessages: ChatMessage[],
  serverMessages: ChatMessage[],
): boolean {
  const localVisible = getVisibleMessages(localMessages);
  const serverVisible = getVisibleMessages(serverMessages);

  if (localVisible.length === 0 || serverVisible.length < localVisible.length) {
    return false;
  }

  for (let i = 0; i < localVisible.length; i++) {
    const local = localVisible[i];
    const server = serverVisible[i];
    if (local.role !== server.role) {
      return false;
    }
    if (messageStableKey(local) !== messageStableKey(server)) {
      return false;
    }
  }

  return true;
}

/**
 * Whether passive server sync may replace the live local transcript.
 * Only accepts merges when the server snapshot is strictly ahead on message count
 * and extends the local transcript — not when local intentionally branched (replay).
 */
export function shouldAcceptRemoteConversationSync(
  localMessages: ChatMessage[],
  serverMessages: ChatMessage[],
): boolean {
  const serverVisibleCount = countVisibleMessages(serverMessages);
  if (serverVisibleCount === 0) {
    return false;
  }

  const localSignature = buildConversationMessageSignature(localMessages);
  const serverSignature = buildConversationMessageSignature(serverMessages);
  if (localSignature === serverSignature) {
    return false;
  }

  const localVisible = getVisibleMessages(localMessages);
  const localVisibleCount = localVisible.length;
  if (serverVisibleCount <= localVisibleCount) {
    return false;
  }

  // Replay trims to a user turn and resends; server still has the old tail.
  const lastLocal = localVisible[localVisibleCount - 1];
  if (lastLocal?.role === "user") {
    return false;
  }

  // After replay, local may have a new assistant id while the server still has the old one.
  if (!localMessagesMatchServerPrefix(localMessages, serverMessages)) {
    return false;
  }

  return true;
}

export function getConversationScrollState(
  conversationId: string,
): ConversationScrollState | null {
  const scrollMap = readConversationScrollMap();
  return scrollMap[conversationId] ?? null;
}

export function saveConversationScrollState(
  conversationId: string,
  scrollState: ConversationScrollState,
): void {
  const scrollMap = readConversationScrollMap();
  scrollMap[conversationId] = scrollState;
  writeConversationScrollMap(scrollMap);
}

export function clearConversationScrollState(conversationId: string): void {
  const scrollMap = readConversationScrollMap();
  if (!scrollMap[conversationId]) {
    return;
  }

  delete scrollMap[conversationId];
  writeConversationScrollMap(scrollMap);
}

export function clearAllConversationScrollState(): void {
  if (!canUseStorage()) {
    return;
  }

  try {
    globalThis.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // Ignore storage errors.
  }
}

export function getStaleConversationIds(args: {
  previousSignatures: ConversationSignatureMap;
  nextSignatures: ConversationSignatureMap;
  activeConversationId: string | null;
}): string[] {
  const { previousSignatures, nextSignatures, activeConversationId } = args;

  return Object.entries(nextSignatures)
    .filter(([conversationId, nextSignature]) => {
      if (conversationId === activeConversationId) {
        return false;
      }

      const previousSignature = previousSignatures[conversationId];
      return Boolean(previousSignature) && previousSignature !== nextSignature;
    })
    .map(([conversationId]) => conversationId);
}
